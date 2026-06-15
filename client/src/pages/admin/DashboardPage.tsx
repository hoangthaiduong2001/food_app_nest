import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, ShoppingCart, Users, Store, Package, Wallet2,
  ArrowUpRight, ArrowDownRight, Minus, Calendar,
} from 'lucide-react'
import { analyticsService } from '@/services/analytics.service'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ TT',
  PENDING_PICKUP: 'Chuẩn bị',
  PENDING_DELIVERY: 'Đang giao',
  DELIVERED: 'Đã giao',
  RETURNED: 'Hoàn trả',
  CANCELLED: 'Đã hủy',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-400',
  PENDING_PICKUP: 'bg-blue-400',
  PENDING_DELIVERY: 'bg-indigo-400',
  DELIVERED: 'bg-green-500',
  RETURNED: 'bg-gray-400',
  CANCELLED: 'bg-red-400',
}

const SELLER_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  PENDING: 'bg-yellow-400',
  APPROVED: 'bg-blue-400',
  REJECTED: 'bg-red-400',
  SUSPENDED: 'bg-gray-400',
}

const SELLER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Chờ kích hoạt',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Tạm ngưng',
}

function GrowthChip({ value }: { value: number }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
      <ArrowUpRight className="h-3 w-3" />+{value}%
    </span>
  )
  if (value < 0) return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
      <ArrowDownRight className="h-3 w-3" />{value}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
      <Minus className="h-3 w-3" />0%
    </span>
  )
}

function BarChart({ data, maxVal }: {
  data: { label: string; value: number; sub?: string }[]
  maxVal: number
}) {
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-400">{d.label}</span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">{formatCurrency(d.value)}</span>
              {d.sub && <span className="text-gray-400">{d.sub}</span>}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: maxVal > 0 ? `${Math.max((d.value / maxVal) * 100, d.value > 0 ? 1 : 0)}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: d, isLoading } = useQuery({
    queryKey: ['admin-dashboard', dateFrom, dateTo],
    queryFn: () => analyticsService.adminDashboard({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  })

  if (isLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-3" />
        <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
      </div>
    </div>
  )

  const maxRevDay = Math.max(...(d?.revenueByDay ?? []).map((r) => r.revenue), 1)
  const maxSellerRev = Math.max(...(d?.topSellers ?? []).map((s) => s.revenue), 1)
  const totalOrderCount = Object.values(d?.ordersByStatus ?? {}).reduce((a, b) => a + b, 0)
  const totalSellerCount = Object.values(d?.sellersByStatus ?? {}).reduce((a, b) => a + b, 0)

  const kpis = [
    {
      label: 'Doanh thu', value: formatCurrency(d?.totalRevenue ?? 0),
      growth: d?.revenueGrowth, icon: TrendingUp,
      gradient: 'from-blue-600 to-indigo-600', lightBg: 'bg-blue-50', iconColor: 'text-blue-600',
    },
    {
      label: 'Đơn hàng', value: (d?.totalOrders ?? 0).toLocaleString(),
      growth: d?.orderGrowth, icon: ShoppingCart,
      gradient: 'from-violet-600 to-purple-600', lightBg: 'bg-violet-50', iconColor: 'text-violet-600',
    },
    {
      label: 'Người dùng', value: (d?.totalUsers ?? 0).toLocaleString(),
      growth: d?.newUsersGrowth, icon: Users,
      gradient: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
    },
    {
      label: 'Sellers', value: (d?.totalSellers ?? 0).toLocaleString(),
      growth: undefined, icon: Store,
      gradient: 'from-orange-500 to-amber-500', lightBg: 'bg-orange-50', iconColor: 'text-orange-500',
    },
    {
      label: 'Sản phẩm', value: (d?.totalProducts ?? 0).toLocaleString(),
      growth: undefined, icon: Package,
      gradient: 'from-pink-500 to-rose-500', lightBg: 'bg-pink-50', iconColor: 'text-pink-600',
    },
    {
      label: 'Hoa hồng', value: formatCurrency(d?.totalCommission ?? 0),
      growth: undefined, icon: Wallet2,
      gradient: 'from-teal-500 to-cyan-600', lightBg: 'bg-teal-50', iconColor: 'text-teal-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="mt-0.5 text-sm text-gray-500">Mặc định 30 ngày gần nhất</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm text-gray-700 focus:outline-none" />
          <span className="text-gray-300">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="text-sm text-gray-700 focus:outline-none" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.label}</span>
              <div className={`rounded-lg p-1.5 ${k.lightBg}`}>
                <k.icon className={`h-3.5 w-3.5 ${k.iconColor}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{k.value}</p>
            {k.growth !== undefined && (
              <div className="mt-2"><GrowthChip value={k.growth} /></div>
            )}
          </div>
        ))}
      </div>

      {/* Revenue chart + status rings */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Doanh thu theo ngày</h2>
            <span className="text-xs text-gray-400">{d?.revenueByDay.length ?? 0} ngày</span>
          </div>
          {(d?.revenueByDay ?? []).length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-gray-400">Không có dữ liệu trong kỳ này</p>
            </div>
          ) : (
            <BarChart
              maxVal={maxRevDay}
              data={d!.revenueByDay.slice(-14).map((r) => ({
                label: r.date.slice(5),
                value: r.revenue,
                sub: `${r.orderCount} đơn`,
              }))}
            />
          )}
        </div>

        {/* Status columns */}
        <div className="space-y-4">
          {/* Orders by status */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Đơn hàng</h2>
            <div className="space-y-2.5">
              {Object.entries(d?.ordersByStatus ?? {}).map(([status, count]) => {
                const pct = totalOrderCount > 0 ? Math.round((count / totalOrderCount) * 100) : 0
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-600">{STATUS_LABEL[status] ?? status}</span>
                      <span className="font-medium text-gray-900">{count} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${STATUS_COLOR[status] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(d?.ordersByStatus ?? {}).length === 0 && (
                <p className="text-sm text-gray-400">Không có dữ liệu</p>
              )}
            </div>
          </div>

          {/* Sellers by status */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">Sellers</h2>
            <div className="space-y-2.5">
              {Object.entries(d?.sellersByStatus ?? {}).map(([status, count]) => {
                const pct = totalSellerCount > 0 ? Math.round((count / totalSellerCount) * 100) : 0
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-600">{SELLER_STATUS_LABEL[status] ?? status}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${SELLER_STATUS_COLOR[status] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top sellers */}
      {(d?.topSellers ?? []).length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-gray-900">Top Sellers</h2>
          <div className="space-y-4">
            {d!.topSellers.map((s, i) => (
              <div key={s.sellerId} className="flex items-center gap-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-gray-900">{s.shopName}</p>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(s.revenue)}</p>
                      <p className="text-xs text-gray-400">{s.orderCount} đơn</p>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${(s.revenue / maxSellerRev) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending settlement banner */}
      {(d?.pendingSettlement ?? 0) > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <Wallet2 className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Quyết toán đang chờ xử lý</p>
              <p className="text-xs text-amber-600">Chạy cron job settlement để xử lý</p>
            </div>
          </div>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(d!.pendingSettlement)}</p>
        </div>
      )}
    </div>
  )
}
