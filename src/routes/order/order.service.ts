import {
  OrderStatus,
  OrderStatusType,
} from '@/shared/constants/order.constant';
import { RoleName } from '@/shared/constants/role.constant';
import {
  DistributedLockService,
  LockBusyError,
} from '@/shared/services/distributed-lock.service';
import { IdempotencyService } from '@/shared/services/idempotency.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { assertTransition } from '@/shared/state-machine/order-state-machine';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartRepository } from '../cart/cart.repository';
import { EmailService } from '../email/email.service';
import { WalletTransactionType } from '../wallet/wallet.model';
import { WalletRepository } from '../wallet/wallet.repository';
import {
  CheckoutBodyType,
  ListOrderQueryType,
  ReceiverType,
} from './order.model';
import { CheckoutItemInput, OrderRepository } from './order.repository';

const CHECKOUT_SCOPE = 'checkout';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly prismaService: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly lockService: DistributedLockService,
    private readonly walletRepository: WalletRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * CHECKOUT FLOW (idempotent):
   *  0. Idempotency: key đã xử lý → trả lại order cũ
   *  1. Lấy cart từ Redis (lọc theo variantIds nếu có)
   *  2. Load variant từ DB (giá/tên/ảnh hiện tại + check tồn tại)
   *  3. createOrderWithStock (transaction: reserve stock + create order)
   *  4. Xoá các item đã đặt khỏi cart
   *  5. Lưu kết quả idempotency
   */
  async checkout(
    userId: number,
    body: CheckoutBodyType,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        message: 'Idempotency-Key header is required',
        path: 'Idempotency-Key',
      });
    }

    try {
      return await this.lockService.withLock(`checkout:user:${userId}`, () =>
        this.checkoutInternal(userId, body, idempotencyKey),
      );
    } catch (error) {
      if (error instanceof LockBusyError) {
        throw new ConflictException({
          message: 'Another checkout is in progress. Please wait and retry.',
        });
      }
      throw error;
    }
  }

  private async checkoutInternal(
    userId: number,
    body: CheckoutBodyType,
    idempotencyKey: string,
  ) {
    // 0. Check idempotency
    const existing = await this.idempotencyService.getResult(
      CHECKOUT_SCOPE,
      idempotencyKey,
    );
    if (existing) {
      if (existing.processing) {
        throw new ConflictException({
          message: 'Checkout is already being processed for this key',
        });
      }
      return existing.result; // trả lại order đã tạo trước đó
    }

    // Chiếm chỗ key — chống retry cùng key
    const reserved = await this.idempotencyService.reserve(
      CHECKOUT_SCOPE,
      idempotencyKey,
    );
    if (!reserved) {
      throw new ConflictException({
        message: 'Checkout is already being processed for this key',
      });
    }

    try {
      const result = await this.doCheckout(userId, body);
      await this.idempotencyService.saveResult(
        CHECKOUT_SCOPE,
        idempotencyKey,
        result,
      );
      return result;
    } catch (error) {
      await this.idempotencyService.release(CHECKOUT_SCOPE, idempotencyKey);
      throw error;
    }
  }

  private async doCheckout(userId: number, body: CheckoutBodyType) {
    // 1. Lấy cart
    const cartMap = await this.cartRepository.getAll(userId);
    if (cartMap.size === 0) {
      throw new BadRequestException({ message: 'Cart is empty' });
    }

    let variantIds = [...cartMap.keys()];
    if (body.variantIds && body.variantIds.length > 0) {
      const notInCart = body.variantIds.filter((id) => !cartMap.has(id));
      if (notInCart.length > 0) {
        throw new BadRequestException({
          message: `These variants are not in your cart: ${notInCart.join(', ')}`,
          path: 'variantIds',
        });
      }
      const wanted = new Set(body.variantIds);
      variantIds = variantIds.filter((id) => wanted.has(id));
    }

    // 2. Load variant từ DB (giá/tên/ảnh mới nhất)
    const variants = await this.prismaService.productVariant.findMany({
      where: { id: { in: variantIds }, deletedAt: null, isActive: true },
      select: {
        id: true,
        price: true,
        name: true,
        attributes: true,
        product: { select: { id: true, name: true, images: true } },
      },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const items: CheckoutItemInput[] = [];
    for (const variantId of variantIds) {
      const v = variantById.get(variantId);
      if (!v) {
        throw new BadRequestException({
          message: `Variant ${variantId} is no longer available`,
          path: 'variantId',
        });
      }
      const quantity = cartMap.get(variantId)!;
      items.push({
        variantId: v.id,
        productId: v.product.id,
        quantity,
        unitPrice: v.price,
        productName: v.product.name,
        productImage: v.product.images[0] ?? null,
        attributes:
          v.attributes === null
            ? undefined
            : (v.attributes as Prisma.InputJsonValue),
      });
    }

    // 3. Tạo order + reserve stock (transaction)
    const order = await this.orderRepository.createOrderWithStock({
      userId,
      items,
      receiver: body.receiver as ReceiverType,
      paymentMethod: body.paymentMethod,
      shippingFee: body.shippingFee,
    });

    // 4. Xoá item đã đặt khỏi cart
    for (const variantId of variantIds) {
      await this.cartRepository.removeItem(userId, variantId);
    }

    const result = this.toOrderResponse(order);

    // 5. Gửi email xác nhận — fire-and-forget, không block response
    this.prismaService.user
      .findUnique({ where: { id: userId }, select: { email: true, name: true } })
      .then((user) => {
        if (!user) return;
        const receiver = body.receiver as ReceiverType;
        return this.emailService.sendOrderConfirmation({
          to: user.email,
          customerName: user.name,
          orderId: result.id,
          items: result.items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            totalPrice: i.totalPrice.toLocaleString('vi-VN') + ' đ',
          })),
          finalAmount: result.finalAmount.toLocaleString('vi-VN') + ' đ',
          paymentMethod: result.paymentMethod,
          shippingAddress: receiver.address,
        });
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to enqueue order-confirmation email', err);
      });

    return result;
  }

  async getOrderForUser(
    orderId: number,
    user: { userId: number; roleName: string },
  ) {
    // Admin xem mọi order; user chỉ xem order của mình
    const order =
      user.roleName === RoleName.Admin
        ? await this.orderRepository.findById(orderId)
        : await this.orderRepository.findByIdForUser(orderId, user.userId);

    if (!order) {
      throw new NotFoundException({ message: 'Order not found', path: 'id' });
    }
    return this.toOrderResponse(order);
  }

  list(query: ListOrderQueryType, user: { userId: number; roleName: string }) {
    return this.orderRepository.list({
      userId: user.roleName === RoleName.Admin ? undefined : user.userId,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  /**
   * Đổi trạng thái order — áp state machine + phân quyền + hoàn kho.
   */
  async updateStatus(
    orderId: number,
    newStatus: OrderStatusType,
    user: { userId: number; roleName: string },
  ) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException({ message: 'Order not found', path: 'id' });
    }

    // Phân quyền: user thường chỉ được CANCEL order của mình khi PENDING_PAYMENT
    if (user.roleName !== RoleName.Admin) {
      if (order.userId !== user.userId) {
        throw new ForbiddenException({ message: 'Not your order' });
      }
      if (newStatus !== OrderStatus.CANCELLED) {
        throw new ForbiddenException({
          message: 'You can only cancel your order',
        });
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictException({
          message: 'Can only cancel orders that are pending payment',
        });
      }
    }

    // State machine: chặn transition sai
    assertTransition(order.status as OrderStatusType, newStatus);

    // Hoàn tiền nếu: order ĐÃ thanh toán + chuyển sang CANCELLED/RETURNED.
    // (Order PENDING_PAYMENT chưa trả tiền nên không cần refund.)
    const isCancelOrReturn =
      newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.RETURNED;
    const wasPaid = order.paymentStatus === 'SUCCESS';
    const refundFn =
      isCancelOrReturn && wasPaid
        ? (tx: Prisma.TransactionClient) =>
            this.walletRepository
              .changeBalanceInTx(tx, {
                userId: order.userId,
                delta: order.finalAmount, // cộng lại
                type: WalletTransactionType.REFUND,
                orderId,
                description: `Refund for order #${orderId} (${newStatus})`,
              })
              .then(() => undefined)
        : undefined;

    // Transaction: đổi status + hoàn kho + hoàn tiền (nếu có) — atomic
    const updated = await this.orderRepository.updateStatusWithStock(
      orderId,
      newStatus,
      user.userId,
      order.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      refundFn,
    );

    return this.toOrderResponse(updated!);
  }

  /**
   * Thanh toán order bằng ví.
   *  1. Order phải PENDING_PAYMENT (state machine)
   *  2. CHECK BALANCE trước → đủ mới chuyển PENDING_PICKUP, thiếu thì 409 rõ ràng,
   *     order giữ nguyên PENDING_PAYMENT để user nạp thêm rồi trả lại.
   *  3. Trừ ví + đổi status trong CÙNG transaction (re-check balance dưới lock
   *     để an toàn với race condition — pre-check chỉ để báo lỗi sớm/đẹp).
   */
  async payOrder(orderId: number, user: { userId: number }) {
    const order = await this.orderRepository.findByIdForUser(
      orderId,
      user.userId,
    );
    if (!order) {
      throw new NotFoundException({ message: 'Order not found', path: 'id' });
    }

    // State machine: chỉ pay được khi PENDING_PAYMENT
    assertTransition(
      order.status as OrderStatusType,
      OrderStatus.PENDING_PICKUP,
    );

    // Pre-check balance — báo lỗi sớm với thông tin thiếu bao nhiêu
    const wallet = await this.walletRepository.getOrCreate(user.userId);
    const walletBalance = Number(wallet.balance);
    if (walletBalance < order.finalAmount) {
      throw new ConflictException({
        message: `Insufficient wallet balance. Balance: ${walletBalance}, required: ${order.finalAmount}, short: ${order.finalAmount - walletBalance}`,
        path: 'balance',
      });
    }

    // 1 transaction: trừ ví (re-check dưới lock) + đổi status (atomic)
    const updated = await this.orderRepository.payOrderWithWallet(
      orderId,
      OrderStatus.PENDING_PICKUP,
      (tx) =>
        this.walletRepository
          .changeBalanceInTx(tx, {
            userId: user.userId,
            delta: -order.finalAmount,
            type: WalletTransactionType.PAYMENT,
            orderId,
            description: `Payment for order #${orderId}`,
          })
          .then(() => undefined),
    );

    return this.toOrderResponse(updated!);
  }

  private toOrderResponse(order: {
    id: number;
    userId: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    shippingFee: number;
    totalAmount: number;
    finalAmount: number;
    receiver: unknown;
    createdAt: Date;
    items: {
      id: number;
      productId: number;
      variantId: number | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      productName: string;
      productImage: string | null;
    }[];
  }) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      receiver: order.receiver,
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        productName: i.productName,
        productImage: i.productImage,
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}
