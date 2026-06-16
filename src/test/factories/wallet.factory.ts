const walletDefaults = {
  id: 1,
  userId: 10,
  accountNumber: 'ACC-0001' as string | null,
  currency: 'VND',
  balance: BigInt(500_000),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

type WalletRaw = typeof walletDefaults;

export const buildWallet = (overrides: Partial<WalletRaw> = {}): WalletRaw => ({
  ...walletDefaults,
  ...overrides,
});

const transactionDefaults = {
  id: 1,
  walletId: 1,
  type: 'TRANSFER_OUT',
  amount: BigInt(100_000),
  balanceBefore: BigInt(500_000),
  balanceAfter: BigInt(400_000),
  orderId: null as number | null,
  originalAmount: null as bigint | null,
  originalCurrency: null as string | null,
  exchangeRate: null as number | null,
  counterpartyAccount: 'ACC-0002' as string | null,
  description: 'Test transfer' as string | null,
  createdAt: new Date('2024-01-01'),
};

type TransactionRaw = typeof transactionDefaults;

export const buildTransaction = (overrides: Partial<TransactionRaw> = {}): TransactionRaw => ({
  ...transactionDefaults,
  ...overrides,
});
