import { EmailService } from '@/routes/email/email.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  ActivateSellerBodyType,
  ApproveSellerBodyType,
  ListSellerQueryType,
  RegisterSellerBodyType,
  RejectSellerBodyType,
  SellerResType,
} from './seller.model';
import { RawSeller, SellerRepository } from './seller.repository';

// Token hết hạn sau 48 giờ
const ACTIVATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);

  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private toRes(s: RawSeller, extra?: { secretKey?: string }): SellerResType {
    return {
      id: s.id,
      userId: s.userId,
      shopName: s.shopName,
      shopSlug: s.shopSlug,
      description: s.description,
      logo: s.logo,
      email: s.email,
      phone: s.phone,
      address: s.address,
      status: s.status,
      commissionRate: Number(s.commissionRate),
      apiKey: s.apiKey,
      secretKey: extra?.secretKey,
      approvedAt: s.approvedAt?.toISOString() ?? null,
      activatedAt: s.activatedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  async register(userId: number, body: RegisterSellerBodyType): Promise<SellerResType> {
    const existing = await this.sellerRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException({ message: 'You already have a seller account', path: 'userId' });
    }

    const slugTaken = await this.sellerRepository.findBySlug(body.shopSlug);
    if (slugTaken) {
      throw new ConflictException({ message: 'Shop slug is already taken', path: 'shopSlug' });
    }

    const apiKey = randomBytes(24).toString('hex');
    // Lưu raw (không bcrypt) vì server cần dùng để tính lại HMAC khi verify request
    const rawSecretKey = randomBytes(32).toString('hex');

    try {
      const seller = await this.sellerRepository.create({
        userId,
        shopName: body.shopName,
        shopSlug: body.shopSlug,
        description: body.description ?? null,
        logo: body.logo ?? null,
        email: body.email,
        phone: body.phone,
        address: body.address,
        apiKey,
        secretKeyHash: rawSecretKey,
      });

      // secretKey trả về 1 lần duy nhất
      return this.toRes(seller, { secretKey: rawSecretKey });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async approve(id: number, adminId: number, body: ApproveSellerBodyType): Promise<SellerResType> {
    const seller = await this.sellerRepository.findById(id);
    if (!seller) {
      throw new NotFoundException({ message: 'Seller not found', path: 'id' });
    }
    if (seller.status !== 'PENDING') {
      throw new ConflictException({ message: `Cannot approve seller with status ${seller.status}` });
    }

    // Gen activation token — seller dùng để verify account thành ACTIVE
    const activationToken = randomBytes(32).toString('hex'); // 64 hex chars
    const activationExpiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS);

    const updated = await this.sellerRepository.approve(
      id,
      adminId,
      body.commissionRate,
      activationToken,
      activationExpiresAt,
    );

    // Fire-and-forget — gửi mail kèm activation token
    this.prisma.user
      .findUnique({ where: { id: seller.userId }, select: { name: true } })
      .then((user) => {
        if (!user) return;
        return this.emailService.sendSellerApproved({
          to: seller.email,
          sellerName: user.name,
          shopName: seller.shopName,
          commissionRate: body.commissionRate,
          approvedAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
          activationToken,
          activationExpiresAt: activationExpiresAt.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
          }),
        });
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to send seller-approved email for seller ${id}`, err);
      });

    return this.toRes(updated);
  }

  async activate(body: ActivateSellerBodyType): Promise<SellerResType> {
    const seller = await this.sellerRepository.findByActivationToken(body.activationToken);

    if (!seller) {
      throw new NotFoundException({ message: 'Invalid activation token', path: 'activationToken' });
    }
    if (seller.status !== 'APPROVED') {
      throw new ConflictException({ message: `Cannot activate seller with status ${seller.status}` });
    }
    if (seller.activationExpiresAt && seller.activationExpiresAt < new Date()) {
      throw new GoneException({ message: 'Activation token has expired. Please contact admin.' });
    }

    const updated = await this.sellerRepository.activate(seller.id);
    return this.toRes(updated);
  }

  async reject(id: number, adminId: number, body: RejectSellerBodyType): Promise<SellerResType> {
    const seller = await this.sellerRepository.findById(id);
    if (!seller) {
      throw new NotFoundException({ message: 'Seller not found', path: 'id' });
    }
    if (seller.status !== 'PENDING') {
      throw new ConflictException({ message: `Cannot reject seller with status ${seller.status}` });
    }

    const updated = await this.sellerRepository.reject(id, adminId, body.reason);

    this.prisma.user
      .findUnique({ where: { id: seller.userId }, select: { name: true } })
      .then((user) => {
        if (!user) return;
        return this.emailService.sendSellerRejected({
          to: seller.email,
          sellerName: user.name,
          shopName: seller.shopName,
          rejectedReason: body.reason,
        });
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to send seller-rejected email for seller ${id}`, err);
      });

    return this.toRes(updated);
  }

  async suspend(id: number): Promise<SellerResType> {
    const seller = await this.sellerRepository.findById(id);
    if (!seller) {
      throw new NotFoundException({ message: 'Seller not found', path: 'id' });
    }
    if (seller.status !== 'ACTIVE') {
      throw new ConflictException({ message: 'Can only suspend active sellers' });
    }

    const updated = await this.sellerRepository.suspend(id);
    return this.toRes(updated);
  }

  async getById(id: number): Promise<SellerResType> {
    const seller = await this.sellerRepository.findById(id);
    if (!seller) {
      throw new NotFoundException({ message: 'Seller not found', path: 'id' });
    }
    return this.toRes(seller);
  }

  async getMe(userId: number): Promise<SellerResType> {
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new NotFoundException({ message: 'Seller account not found', path: 'userId' });
    }
    return this.toRes(seller);
  }

  async list(query: ListSellerQueryType) {
    const result = await this.sellerRepository.list({
      status: query.status as any,
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      ...result,
      data: result.data.map((s) => this.toRes(s)),
    };
  }

  async getFilters(sellerId: number) {
    const seller = await this.sellerRepository.getFilters(sellerId);
    if (!seller) throw new NotFoundException('Seller not found');
    return seller;
  }
}
