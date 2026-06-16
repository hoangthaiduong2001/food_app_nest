import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@/shared/constants/order.constant';
import { RoleName } from '@/shared/constants/role.constant';
import { PUB_SUB } from '@/shared/pubsub.provider';
import { buildOrderRaw } from '@/test/factories/order.factory';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CartRepository } from '../cart/cart.repository';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { WalletRepository } from '../wallet/wallet.repository';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { DistributedLockService } from '@/shared/services/distributed-lock.service';
import { IdempotencyService } from '@/shared/services/idempotency.service';
import { PrismaService } from '@/shared/services/prisma.service';

const mockOrderRepo = {
  findById: jest.fn(),
  findByIdForUser: jest.fn(),
  findByIdForSeller: jest.fn(),
  list: jest.fn(),
  createOrderWithStock: jest.fn(),
  updateStatusWithStock: jest.fn(),
  payOrderWithWallet: jest.fn(),
};

const mockCartRepo = { getAll: jest.fn(), removeItem: jest.fn() };
const mockWalletRepo = { getOrCreate: jest.fn(), changeBalanceInTx: jest.fn() };
const mockEmailService = { sendOrderConfirmation: jest.fn(), enqueue: jest.fn() };
const mockNotification = { send: jest.fn(), notifyOrderStatusChanged: jest.fn(), notifySellerNewOrder: jest.fn() };
const mockActivityLog = { log: jest.fn() };
const mockPubSub = { publish: jest.fn() };
const mockLockService = { withLock: jest.fn((_, fn: () => unknown) => fn()) };
const mockIdempotency = {
  getResult: jest.fn(),
  reserve: jest.fn(),
  saveResult: jest.fn(),
  release: jest.fn(),
};
const mockPrisma = {
  productVariant: { findMany: jest.fn() },
  user: { findUnique: jest.fn() },
  seller: { findUnique: jest.fn() },
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: mockOrderRepo },
        { provide: CartRepository, useValue: mockCartRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IdempotencyService, useValue: mockIdempotency },
        { provide: DistributedLockService, useValue: mockLockService },
        { provide: WalletRepository, useValue: mockWalletRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ActivityLogService, useValue: mockActivityLog },
        { provide: PUB_SUB, useValue: mockPubSub },
      ],
    }).compile();

    service = module.get(OrderService);
    jest.clearAllMocks();
  });

  // ─── checkout ─────────────────────────────────────────────────
  describe('checkout', () => {
    it('throws BadRequestException when idempotency key is missing', async () => {
      await expect(
        service.checkout(1, {} as never, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing order when idempotency key already processed', async () => {
      const existingOrder = { id: 99, status: OrderStatus.PENDING_PAYMENT };
      mockIdempotency.getResult.mockResolvedValue({ processing: false, result: existingOrder });

      const result = await service.checkout(1, {} as never, 'key-abc');

      expect(result).toEqual(existingOrder);
      expect(mockOrderRepo.createOrderWithStock).not.toHaveBeenCalled();
    });

    it('throws ConflictException when key is currently being processed', async () => {
      mockIdempotency.getResult.mockResolvedValue({ processing: true });

      await expect(service.checkout(1, {} as never, 'key-abc')).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when cart is empty', async () => {
      mockIdempotency.getResult.mockResolvedValue(null);
      mockIdempotency.reserve.mockResolvedValue(true);
      mockCartRepo.getAll.mockResolvedValue(new Map());

      await expect(
        service.checkout(1, { receiver: {}, paymentMethod: 'COD' } as never, 'key-xyz'),
      ).rejects.toThrow(BadRequestException);

      expect(mockIdempotency.release).toHaveBeenCalled();
    });

    it('throws BadRequestException when variantIds are not in cart', async () => {
      mockIdempotency.getResult.mockResolvedValue(null);
      mockIdempotency.reserve.mockResolvedValue(true);
      mockCartRepo.getAll.mockResolvedValue(new Map([[1, 2]]));

      await expect(
        service.checkout(
          1,
          { variantIds: [99], receiver: {}, paymentMethod: 'COD' } as never,
          'key-xyz',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getOrderForUser ──────────────────────────────────────────
  describe('getOrderForUser', () => {
    it('admin can view any order', async () => {
      const order = buildOrderRaw({ id: 5, userId: 99 });
      mockOrderRepo.findById.mockResolvedValue(order);

      const result = await service.getOrderForUser(5, {
        userId: 1,
        roleName: RoleName.Admin,
      });

      expect(result.id).toBe(5);
      expect(mockOrderRepo.findById).toHaveBeenCalledWith(5);
      expect(mockOrderRepo.findByIdForUser).not.toHaveBeenCalled();
    });

    it('regular user can only view their own order', async () => {
      const order = buildOrderRaw({ id: 5, userId: 10 });
      mockOrderRepo.findByIdForUser.mockResolvedValue(order);

      await service.getOrderForUser(5, { userId: 10, roleName: RoleName.Client });

      expect(mockOrderRepo.findByIdForUser).toHaveBeenCalledWith(5, 10);
    });

    it('throws NotFoundException when order not found', async () => {
      mockOrderRepo.findByIdForUser.mockResolvedValue(null);

      await expect(
        service.getOrderForUser(999, { userId: 10, roleName: RoleName.Client }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────
  describe('updateStatus', () => {
    it('regular user can cancel their own PENDING_PAYMENT order', async () => {
      const order = buildOrderRaw({ userId: 10, status: OrderStatus.PENDING_PAYMENT });
      mockOrderRepo.findById.mockResolvedValue(order);
      mockOrderRepo.updateStatusWithStock.mockResolvedValue(
        buildOrderRaw({ status: OrderStatus.CANCELLED }),
      );
      mockPubSub.publish.mockResolvedValue(undefined);

      await service.updateStatus(1, OrderStatus.CANCELLED, {
        userId: 10,
        roleName: RoleName.Client,
      });

      expect(mockOrderRepo.updateStatusWithStock).toHaveBeenCalled();
    });

    it('throws ForbiddenException when user tries to cancel another user order', async () => {
      const order = buildOrderRaw({ userId: 99 });
      mockOrderRepo.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus(1, OrderStatus.CANCELLED, {
          userId: 10,
          roleName: RoleName.Client,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user tries to set status other than CANCELLED', async () => {
      const order = buildOrderRaw({ userId: 10 });
      mockOrderRepo.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus(1, OrderStatus.DELIVERED, {
          userId: 10,
          roleName: RoleName.Client,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when cancelling order not in PENDING_PAYMENT', async () => {
      const order = buildOrderRaw({ userId: 10, status: OrderStatus.PENDING_DELIVERY });
      mockOrderRepo.findById.mockResolvedValue(order);

      await expect(
        service.updateStatus(1, OrderStatus.CANCELLED, {
          userId: 10,
          roleName: RoleName.Client,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when order does not exist', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(999, OrderStatus.CANCELLED, {
          userId: 1,
          roleName: RoleName.Admin,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatusForSeller ────────────────────────────────────
  describe('updateStatusForSeller', () => {
    it('seller can transition order to PENDING_DELIVERY', async () => {
      const order = buildOrderRaw({
        userId: 10,
        status: OrderStatus.PENDING_PICKUP,
        items: [{ id: 1, orderId: 1, variantId: 5, productId: 2, quantity: 2, unitPrice: 100_000, totalPrice: 200_000, productName: 'Test', productImage: null, attributes: null }],
      });
      mockOrderRepo.findByIdForSeller.mockResolvedValue(order);
      mockOrderRepo.updateStatusWithStock.mockResolvedValue(
        buildOrderRaw({ status: OrderStatus.PENDING_DELIVERY }),
      );
      mockPubSub.publish.mockResolvedValue(undefined);

      await service.updateStatusForSeller(1, 3, OrderStatus.PENDING_DELIVERY, 99);

      expect(mockOrderRepo.updateStatusWithStock).toHaveBeenCalled();
    });

    it('throws ForbiddenException when seller tries to set CANCELLED', async () => {
      const order = buildOrderRaw({ status: OrderStatus.PENDING_PAYMENT });
      mockOrderRepo.findByIdForSeller.mockResolvedValue(order);

      await expect(
        service.updateStatusForSeller(1, 3, OrderStatus.CANCELLED, 99),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when order does not belong to seller', async () => {
      mockOrderRepo.findByIdForSeller.mockResolvedValue(null);

      await expect(
        service.updateStatusForSeller(1, 3, OrderStatus.PENDING_DELIVERY, 99),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getOrderForSeller ────────────────────────────────────────
  describe('getOrderForSeller', () => {
    it('returns order when found for seller', async () => {
      const order = buildOrderRaw({ id: 3 });
      mockOrderRepo.findByIdForSeller.mockResolvedValue(order);

      const result = await service.getOrderForSeller(3, 5);

      expect(result.id).toBe(3);
      expect(mockOrderRepo.findByIdForSeller).toHaveBeenCalledWith(3, 5);
    });

    it('throws NotFoundException when order not found for seller', async () => {
      mockOrderRepo.findByIdForSeller.mockResolvedValue(null);

      await expect(service.getOrderForSeller(999, 5)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── list ─────────────────────────────────────────────────────
  describe('list', () => {
    const listResult = {
      data: [
        {
          ...buildOrderRaw(),
          shippingFee: BigInt(30_000),
          totalAmount: BigInt(200_000),
          finalAmount: BigInt(230_000),
          createdBy: { id: 10, name: 'User A', email: 'a@test.com' },
        },
      ],
      nextCursor: null,
      hasMore: false,
    };

    it('admin can filter by any userId and search', async () => {
      mockOrderRepo.list.mockResolvedValue(listResult);

      const result = await service.list(
        { userId: 99, search: 'test', limit: 10 } as never,
        { userId: 1, roleName: RoleName.Admin },
      );

      expect(mockOrderRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 99, search: 'test' }),
      );
      expect(result.data[0].finalAmount).toBe(230_000);
    });

    it('regular user is locked to their own userId, search is ignored', async () => {
      mockOrderRepo.list.mockResolvedValue(listResult);

      await service.list(
        { userId: 99, search: 'ignored', limit: 10 } as never,
        { userId: 10, roleName: RoleName.Client },
      );

      expect(mockOrderRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, search: undefined }),
      );
    });

    it('maps BigInt fields to number and transforms createdBy to user', async () => {
      mockOrderRepo.list.mockResolvedValue(listResult);

      const result = await service.list(
        { limit: 10 } as never,
        { userId: 10, roleName: RoleName.Client },
      );

      expect(typeof result.data[0].shippingFee).toBe('number');
      expect(result.data[0].shippingFee).toBe(30_000);
    });
  });

  // ─── listForSeller ────────────────────────────────────────────
  describe('listForSeller', () => {
    it('delegates to repository with sellerId', async () => {
      mockOrderRepo.list.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      });

      await service.listForSeller(7, { limit: 10 } as never);

      expect(mockOrderRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({ sellerId: 7 }),
      );
    });
  });

  // ─── payOrder ─────────────────────────────────────────────────
  describe('payOrder', () => {
    it('throws NotFoundException when order does not exist', async () => {
      mockOrderRepo.findByIdForUser.mockResolvedValue(null);

      await expect(service.payOrder(999, { userId: 10 })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when wallet balance is insufficient', async () => {
      const order = buildOrderRaw({ status: OrderStatus.PENDING_PAYMENT, finalAmount: 500_000 });
      mockOrderRepo.findByIdForUser.mockResolvedValue(order);
      mockWalletRepo.getOrCreate.mockResolvedValue({ balance: BigInt(100_000) });

      await expect(service.payOrder(1, { userId: 10 })).rejects.toThrow(ConflictException);
    });

    it('pays successfully when balance is sufficient', async () => {
      const order = buildOrderRaw({ status: OrderStatus.PENDING_PAYMENT, finalAmount: 200_000 });
      const updated = buildOrderRaw({ status: OrderStatus.PENDING_PICKUP });
      mockOrderRepo.findByIdForUser.mockResolvedValue(order);
      mockWalletRepo.getOrCreate.mockResolvedValue({ balance: BigInt(500_000) });
      mockOrderRepo.payOrderWithWallet.mockResolvedValue(updated);

      const result = await service.payOrder(1, { userId: 10 });

      expect(result.status).toBe(OrderStatus.PENDING_PICKUP);
    });
  });
});
