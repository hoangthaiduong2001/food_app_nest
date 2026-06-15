import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, ShoppingCart, Wallet2, Package,
  ArrowUpRight, ArrowDownRight, Minus, Calendar,
  BadgeCheck, Clock,
} from 'lucide-react'
import { analyticsService } from '@/services/analytics.service'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'

type Granularity = 'day' | 'week' | 'month'

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_PICKUP: 'Chờ lấy hàng',
  PENDING_DELIVERY: 'Đang giao',
  DELIVERED: 'Đã giao',
  RETURNED: 'Hoàn trả',
  CANCELLED: 'Đã hủy',
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-400',
  PENDING_PICKUP: 'bg-blue-400',
  PENDING_DELIVERY: 'bg-indigo-400',
  DELIVERED: 'bg-green-500',
  RETURNED: 'bg-gray-400',
  CANCELLED: 'bg-red-400',
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

export default function SellerAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [granularity, setGranularity] = useState<Granularity>('day')

  const { data: d, isLoading } = useQuery({
    queryKey: ['seller-analytics', dateFrom, dateTo, granularity],
    queryFn: () => analyticsService.sellerAnalytics({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      granularity,
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

  const maxPeriodRev = Math.max(...(d?.revenueByPeriod ?? []).map((r) => r.revenue), 1)
  const maxProductRev = Math.max(...(d?.topProducts ?? []).map((p) => p.revenue), 1)
  const totalOrderCount = Object.values(d?.ordersByStatus ?? {}).reduce((a, b) => a + b, 0)

  const kpis = [
    {
      label: 'Tổng doanh thu', value: formatCurrency(d?.totalRevenue ?? 0),
      growth: d?.revenueGrowth, icon: TrendingUp,
      lightBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
    },
    {
      label: 'Thực nhận', value: formatCurrency(d?.netRevenue ?? 0),
      growth: undefined, icon: Wallet2,
      lightBg: 'bg-blue-50', iconColor: 'text-blue-600',
    },
    {
      label: 'Số đơn hàng', value: (d?.totalOrders ?? 0).toLocaleString(),
      growth: d?.orderGrowth, icon: ShoppingCart,
      lightBg: 'bg-violet-50', iconColor: 'text-violet-600',
    },
    {
      label: 'Hoa hồng', value: formatCurrency(d?.totalCommission ?? 0),
      growth: undefined, icon: Package,
      lightBg: 'bg-orange-50', iconColor: 'text-orange-500',
    },
  ]

  const granularityLabel = granularity === 'day' ? 'ngày' : granularity === 'week' ? 'tuần' : 'tháng'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thống kê</h1>
          {d?.walletBalance !== undefined && (
            <div className="mt-1 flex items-center gap-1.5">
              <Wallet2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-gray-500">Số dư ví:</span>
              <span className="text-sm font-bold text-emerald-600">{formatCurrency(d.walletBalance)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="day">Theo ngày</option>
            <option value="week">Theo tuần</option>
            <option value="month">Theo tháng</option>
          </select>
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
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      {/* Revenue chart + order status */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue bar chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Doanh thu theo {granularityLabel}</h2>
            <span className="text-xs text-gray-400">{d?.revenueByPeriod.length ?? 0} kỳ</span>
          </div>
          {(d?.revenueByPeriod ?? []).length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-gray-400">Không có dữ liệu trong kỳ này</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {d!.revenueByPeriod.map((r) => (
                <div key={r.period} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-right text-xs text-gray-400">{r.period.slice(5)}</span>
                  <div className="flex-1">
                    <div className="h-6 w-full overflow-hidden rounded-md bg-gray-50">
                      <div
                        className="flex h-full items-center rounded-md bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${Math.max((r.revenue / maxPeriodRev) * 100, r.revenue > 0 ? 2 : 0)}%` }}
                      >
                        {r.revenue > 0 && (
                          <span className="pl-2 text-xs font-semibold text-white">{formatCurrency(r.revenue)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-gray-400">{r.orderCount} đơn</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Đơn hàng</h2>
          <div className="space-y-2.5">
            {Object.entries(d?.ordersByStatus ?? {}).map(([status, count]) => {
              const pct = totalOrderCount > 0 ? Math.round((count / totalOrderCount) * 100) : 0
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-600">{ORDER_STATUS_LABEL[status] ?? status}</span>
                    <span className="font-medium text-gray-900">{count} <span className="text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${ORDER_STATUS_COLOR[status] ?? 'bg-gray-400'}`}
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
      </div>

      {/* Top products + Settlements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-gray-900">Top sản phẩm bán chạy</h2>
          {(d?.topProducts ?? []).length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-gray-400">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="space-y-4">
              {d!.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">{p.productName}</p>
                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(p.revenue)}</p>
                        <p className="text-xs text-gray-400">Đã bán: {p.totalSold}</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${(p.revenue / maxProductRev) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent settlements */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-semibold text-gray-900">Quyết toán gần đây</h2>
          {(d?.recentSettlements ?? []).length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-gray-400">Chưa có quyết toán nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {d!.recentSettlements.map((s) => {
                const isProcessed = s.status === 'PROCESSED' || s.status === 'PAID'
                return (
                  <div key={s.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3.5">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isProcessed ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {isProcessed
                        ? <BadgeCheck className="h-4 w-4 text-green-600" />
                        : <Clock className="h-4 w-4 text-yellow-600" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-400">{s.periodFrom} → {s.periodTo}</p>
                          <p className="mt-0.5 text-base font-bold text-gray-900">{formatCurrency(s.netAmount)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isProcessed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isProcessed ? 'Đã xử lý' : 'Chờ xử lý'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {s.orderCount} đơn · Doanh thu: {formatCurrency(s.grossAmount)} · Hoa hồng: {formatCurrency(s.commissionAmt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
