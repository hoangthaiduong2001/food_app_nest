import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { buildWallet, buildTransaction } from '@/test/factories/wallet.factory';
import { NotificationService } from '../notification/notification.service';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';

const mockWalletRepo = {
  getOrCreate: jest.fn(),
  setCurrency: jest.fn(),
  listTransactions: jest.fn(),
  transfer: jest.fn(),
  lookupAccount: jest.fn(),
};

const mockNotification = {
  send: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: WalletRepository, useValue: mockWalletRepo },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get(WalletService);
    jest.clearAllMocks();
  });

  // ─── getWalletInfo ────────────────────────────────────────────
  describe('getWalletInfo', () => {
    it('returns wallet info with correct format', async () => {
      const wallet = buildWallet({ balance: BigInt(500_000), currency: 'VND' });
      mockWalletRepo.getOrCreate.mockResolvedValue(wallet);

      const result = await service.getWalletInfo(10);

      expect(result).toEqual({
        accountNumber: 'ACC-0001',
        currency: 'VND',
        balance: 500_000,
      });
    });

    it('returns null accountNumber when not set', async () => {
      const wallet = buildWallet({ accountNumber: null });
      mockWalletRepo.getOrCreate.mockResolvedValue(wallet);

      const result = await service.getWalletInfo(10);

      expect(result.accountNumber).toBeNull();
    });
  });

  // ─── setCurrency ──────────────────────────────────────────────
  describe('setCurrency', () => {
    it('sets currency and returns updated wallet', async () => {
      const wallet = buildWallet();
      const updated = buildWallet({ currency: 'USD', balance: BigInt(20) });
      mockWalletRepo.getOrCreate.mockResolvedValue(wallet);
      mockWalletRepo.setCurrency.mockResolvedValue(updated);

      const result = await service.setCurrency(10, 'USD');

      expect(result.currency).toBe('USD');
      expect(mockWalletRepo.setCurrency).toHaveBeenCalledWith(10, 'USD');
    });
  });

  // ─── listTransactions ─────────────────────────────────────────
  describe('listTransactions', () => {
    it('maps BigInt fields to number with correct format', async () => {
      const tx = buildTransaction();
      mockWalletRepo.getOrCreate.mockResolvedValue(buildWallet());
      mockWalletRepo.listTransactions.mockResolvedValue({
        data: [tx],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.listTransactions(10, { limit: 10 } as never);

      expect(result.data[0].amount).toBe(100_000);
      expect(result.data[0].balanceBefore).toBe(500_000);
      expect(result.data[0].balanceAfter).toBe(400_000);
      expect(typeof result.data[0].amount).toBe('number');
    });
  });

  // ─── transfer ─────────────────────────────────────────────────
  describe('transfer', () => {
    const transferResult = {
      fromAccountNumber: 'ACC-0001',
      toAccountNumber: 'ACC-0002',
      amount: 100_000,
    };

    it('transfers successfully and notifies sender', async () => {
      mockWalletRepo.transfer.mockResolvedValue(transferResult);
      mockWalletRepo.lookupAccount.mockResolvedValue(null);

      await service.transfer(10, 'ACC-0002', 100_000);

      expect(mockWalletRepo.transfer).toHaveBeenCalledWith({
        fromUserId: 10,
        toAccountNumber: 'ACC-0002',
        amount: 100_000,
        description: undefined,
      });
      expect(mockNotification.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 10, type: 'wallet' }),
      );
    });

    it('also notifies receiver when lookup succeeds', async () => {
      mockWalletRepo.transfer.mockResolvedValue(transferResult);
      mockWalletRepo.lookupAccount.mockResolvedValue({ userId: 20, accountNumber: 'ACC-0002' });

      await service.transfer(10, 'ACC-0002', 100_000);

      await Promise.resolve();

      expect(mockNotification.send).toHaveBeenCalledTimes(2);
      expect(mockNotification.send).toHaveBeenLastCalledWith(
        expect.objectContaining({ userId: 20, type: 'wallet' }),
      );
    });
  });

  // ─── lookupAccount ────────────────────────────────────────────
  describe('lookupAccount', () => {
    it('returns account info when found', async () => {
      mockWalletRepo.lookupAccount.mockResolvedValue({
        accountNumber: 'ACC-0001',
        user: { name: 'Nguyen Van A' },
      });

      const result = await service.lookupAccount('ACC-0001');

      expect(result).toEqual({ accountNumber: 'ACC-0001', accountName: 'Nguyen Van A' });
    });

    it('throws NotFoundException when account not found', async () => {
      mockWalletRepo.lookupAccount.mockResolvedValue(null);

      await expect(service.lookupAccount('INVALID')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when account exists but accountNumber is null', async () => {
      mockWalletRepo.lookupAccount.mockResolvedValue({
        accountNumber: null,
        user: { name: 'Test' },
      });

      await expect(service.lookupAccount('ACC-NULL')).rejects.toThrow(NotFoundException);
    });
  });
});
