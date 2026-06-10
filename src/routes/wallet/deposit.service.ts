import { toISO } from '@/shared/model/transform.helper';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
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

@Injectable()
export class DepositService {
  constructor(private readonly depositRepository: DepositRepository) {}

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
    return this.toResponse(updated);
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
    return this.toResponse(updated);
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
