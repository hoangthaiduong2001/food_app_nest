import { api } from '@/lib/api'

export interface AdminDashboard {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalSellers: number
  totalProducts: number
  revenueGrowth: number
  orderGrowth: number
  newUsersGrowth: number
  ordersByStatus: Record<string, number>
  revenueByDay: { date: string; revenue: number; orderCount: number }[]
  sellersByStatus: Record<string, number>
  topSellers: { sellerId: number; shopName: string; revenue: number; orderCount: number }[]
  totalCommission: number
  pendingSettlement: number
}

export interface SellerAnalytics {
  totalRevenue: number
  netRevenue: number
  totalOrders: number
  totalCommission: number
  walletBalance: number
  revenueGrowth: number
  orderGrowth: number
  ordersByStatus: Record<string, number>
  revenueByPeriod: { period: string; revenue: number; orderCount: number }[]
  topProducts: { productId: number; productName: string; totalSold: number; revenue: number }[]
  recentSettlements: {
    id: number
    periodFrom: string
    periodTo: string
    orderCount: number
    grossAmount: number
    commissionAmt: number
    netAmount: number
    status: string
    processedAt: string | null
  }[]
}

export const analyticsService = {
  adminDashboard: (params?: { dateFrom?: string; dateTo?: string }) =>
    api
      .get<{ data: AdminDashboard }>('/admin/dashboard', { params })
      .then((r) => r.data.data),

  sellerAnalytics: (params?: { dateFrom?: string; dateTo?: string; granularity?: 'day' | 'week' | 'month' }) =>
    api
      .get<{ data: SellerAnalytics }>('/sellers/me/analytics', { params })
      .then((r) => r.data.data),
}
