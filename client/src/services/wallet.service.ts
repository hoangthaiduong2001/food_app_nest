import { api } from '@/lib/api'
import type { Wallet, WalletTransaction, DepositRequest, ExchangeRate, Currency } from '@/types'

export const walletService = {
  get: () => api.get<{ data: Wallet }>('/wallet').then((r) => r.data.data),

  transactions: (params: { type?: string; limit?: number; cursor?: number } = {}) =>
    api
      .get<{ data: { data: WalletTransaction[]; nextCursor: number | null; hasMore: boolean } }>(
        '/wallet/transactions',
        { params },
      )
      .then((r) => r.data.data),

  setCurrency: (currency: Currency) =>
    api.post<{ data: Wallet }>('/wallet/currency', { currency }).then((r) => r.data.data),

  exchangeRates: () =>
    api.get<{ data: ExchangeRate[] }>('/wallet/exchange-rates').then((r) => r.data.data),

  transfer: (payload: { toAccountNumber: string; amount: number; description?: string }) =>
    api.post<{ data: unknown }>('/wallet/transfer', payload).then((r) => r.data.data),

  lookupAccount: (accountNumber: string) =>
    api
      .get<{ data: { name: string } }>(`/wallet/accounts/${accountNumber}`)
      .then((r) => r.data.data),

  createDepositRequest: (payload: { currency: Currency; amount: number; note?: string }) =>
    api
      .post<{ data: DepositRequest }>('/wallet/deposit-requests', payload)
      .then((r) => r.data.data),

  createWithdrawRequest: (payload: { currency: Currency; amount: number; note?: string }) =>
    api
      .post<{ data: DepositRequest }>('/wallet/withdraw-requests', payload)
      .then((r) => r.data.data),

  listDepositRequests: (params: { status?: string; limit?: number; cursor?: number } = {}) =>
    api
      .get<{ data: { data: DepositRequest[]; nextCursor: number | null; hasMore: boolean } }>(
        '/wallet/deposit-requests',
        { params },
      )
      .then((r) => r.data.data),

  cancelDepositRequest: (id: number) =>
    api.delete<{ data: DepositRequest }>(`/wallet/deposit-requests/${id}`).then((r) => r.data.data),

  // Admin
  adminListRequests: (params: { status?: string; limit?: number; cursor?: number } = {}) =>
    api
      .get<{ data: { data: DepositRequest[]; nextCursor: number | null; hasMore: boolean } }>(
        '/wallet/admin/deposit-requests',
        { params },
      )
      .then((r) => r.data.data),

  adminApprove: (id: number) =>
    api.post<{ data: DepositRequest }>(`/wallet/admin/deposit-requests/${id}/approve`).then((r) => r.data.data),

  adminReject: (id: number, rejectReason: string) =>
    api
      .post<{ data: DepositRequest }>(`/wallet/admin/deposit-requests/${id}/reject`, { rejectReason })
      .then((r) => r.data.data),

  adminSetExchangeRate: (payload: {
    fromCurrency: Currency
    toCurrency: Currency
    rate: number
  }) =>
    api.post<{ data: ExchangeRate }>('/wallet/admin/exchange-rates', payload).then((r) => r.data.data),
}
