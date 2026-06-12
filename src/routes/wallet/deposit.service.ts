import { toISO } from '@/shared/model/transform.helper';
import { EmailService } from '@/routes/email/email.service';
import { NotificationService } from '@/routes/notification/notification.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DepositRequestResType,
  DepositRequestStatus,
  ListDepositRequestQueryType,
  WalletRequestTypeEnum,
} from './deposit.model';
import { CurrencyType } from './currency.model';
import { DepositRepository } from './deposit.repository';
import { PrismaService } from '@/shared/services/prisma.service';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private readonly depositRepository: DepositRepository,
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async createRequest(
    userId: number,
    type: WalletRequestTypeEnum,
    currency: CurrencyType,
    amount: number,
    note?: string,
  ): Promise<DepositRequestResType> {
    const created = await this.depositRepository.create(
      userId,
      type,
      currency,
      amount,
      note,
    );
    return this.toResponse(created);
  }

  list(query: ListDepositRequestQueryType, userId: number) {
    return this.depositRepository
      .list({
        userId,
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      })
      .then((r) => ({
        ...r,
        data: r.data.map((d) => this.toResponse(d)),
      }));
  }

  listAll(query: ListDepositRequestQueryType) {
    return this.depositRepository
      .list({ status: query.status, limit: query.limit, cursor: query.cursor })
      .then((r) => ({
        ...r,
        data: r.data.map((d) => this.toResponse(d)),
      }));
  }

  async cancel(id: number, userId: number): Promise<DepositRequestResType> {
    const req = await this.depositRepository.findById(id);
    if (!req) {
      throw new NotFoundException({ message: 'Deposit request not found' });
    }
    if (req.userId !== userId) {
      throw new ForbiddenException({ message: 'Not your deposit request' });
    }
    this.assertPending(req.status);

    const updated = await this.depositRepository.cancel(
      id,
      req.userId,
      req.type as WalletRequestTypeEnum,
      req.currency as CurrencyType,
      req.amount,
    );
    return this.toResponse(updated);
  }

  async approve(id: number, adminId: number): Promise<DepositRequestResType> {
    const req = await this.depositRepository.findById(id);
    if (!req) {
      throw new NotFoundException({ message: 'Deposit request not found' });
    }
    this.assertPending(req.status);

    const updated = await this.depositRepository.approve(
      id,
      req.userId,
      req.type as WalletRequestTypeEnum,
      req.currency as CurrencyType,
      req.amount,
      adminId,
    );
    const result = this.toResponse(updated);

    // WebSocket notification — fire-and-forget
    const isDeposit = req.type === 'DEPOSIT';
    this.notificationService.send({
      userId: req.userId,
      title: isDeposit ? 'Deposit approved' : 'Withdrawal approved',
      body: `Your ${isDeposit ? 'deposit' : 'withdrawal'} of ${req.amount.toLocaleString('vi-VN')} ${req.currency} has been approved.`,
      type: 'wallet',
    });

    this.prismaService.user
      .findUnique({ where: { id: req.userId }, select: { email: true, name: true } })
      .then((user) => {
        if (!user) return;
        return this.emailService.sendDepositApproved({
          to: user.email,
          customerName: user.name,
          requestId: id,
          amount: req.amount.toLocaleString('vi-VN'),
          currency: req.currency,
          newBalance: 'check your wallet',
        });
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to enqueue deposit-approved email', err);
      });

    return result;
  }

  async reject(
    id: number,
    adminId: number,
    rejectReason: string,
  ): Promise<DepositRequestResType> {
    const req = await this.depositRepository.findById(id);
    if (!req) {
      throw new NotFoundException({ message: 'Deposit request not found' });
    }
    this.assertPending(req.status);

    const updated = await this.depositRepository.reject(
      id,
      req.userId,
      req.type as WalletRequestTypeEnum,
      req.currency as CurrencyType,
      req.amount,
      adminId,
      rejectReason,
    );
    const result = this.toResponse(updated);

    // WebSocket notification
    const isDeposit = req.type === 'DEPOSIT';
    this.notificationService.send({
      userId: req.userId,
      title: isDeposit ? 'Deposit rejected' : 'Withdrawal rejected',
      body: `Your ${isDeposit ? 'deposit' : 'withdrawal'} of ${req.amount.toLocaleString('vi-VN')} ${req.currency} was rejected. Reason: ${rejectReason}`,
      type: 'wallet',
    });

    this.prismaService.user
      .findUnique({ where: { id: req.userId }, select: { email: true, name: true } })
      .then((user) => {
        if (!user) return;
        return this.emailService.sendDepositRejected({
          to: user.email,
          customerName: user.name,
          requestId: id,
          amount: req.amount.toLocaleString('vi-VN'),
          currency: req.currency,
          rejectReason,
        });
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to enqueue deposit-rejected email', err);
      });

    return result;
  }

  private assertPending(status: string) {
    if (status !== DepositRequestStatus.PENDING) {
      throw new ConflictException({
        message: `Deposit request already ${status.toLowerCase()}, cannot process`,
        path: 'status',
      });
    }
  }

  private toResponse(d: {
    id: number;
    userId: number;
    type: string;
    currency: string;
    amount: number;
    status: string;
    note: string | null;
    reviewedById: number | null;
    reviewedAt: Date | null;
    rejectReason: string | null;
    createdAt: Date;
  }): DepositRequestResType {
    return {
      id: d.id,
      userId: d.userId,
      type: d.type as DepositRequestResType['type'],
      currency: d.currency as DepositRequestResType['currency'],
      amount: d.amount,
      status: d.status as DepositRequestResType['status'],
      note: d.note,
      reviewedById: d.reviewedById,
      reviewedAt: toISO(d.reviewedAt),
      rejectReason: d.rejectReason,
      createdAt: toISO(d.createdAt),
    };
  }
}
