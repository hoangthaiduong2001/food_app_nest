import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ShoppingBag, Search, ChevronRight, X } from 'lucide-react'
import { sellerOrderService } from '@/services/seller-order.service'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useDebounce } from '@/hooks/useDebounce'
import { TablePagination } from '@/components/ui/table-pagination'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { OrderStatus, Order } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'destructive' | 'warning'

const STATUS_BADGE: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: 'warning',
  PENDING_PICKUP: 'default',
  PENDING_DELIVERY: 'default',
  DELIVERED: 'success',
  RETURNED: 'secondary',
  CANCELLED: 'destructive',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ TT',
  PENDING_PICKUP: 'Chờ lấy hàng',
  PENDING_DELIVERY: 'Đang giao',
  DELIVERED: 'Đã giao',
  RETURNED: 'Hoàn trả',
  CANCELLED: 'Đã hủy',
}

// Seller chỉ được chuyển trạng thái theo flow: PENDING_PICKUP → PENDING_DELIVERY → DELIVERED
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING_PICKUP: 'PENDING_DELIVERY',
  PENDING_DELIVERY: 'DELIVERED',
}

const ALL_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PENDING_PICKUP',
  'PENDING_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
]

const LIMIT = 15

export default function SellerOrdersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [detail, setDetail] = useState<Order | null>(null)
  const debouncedSearch = useDebounce(search, 400)
  const pg = useCursorPagination(LIMIT)

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-orders', debouncedSearch, statusFilter, pg.cursor],
    queryFn: () =>
      sellerOrderService.list({
        limit: LIMIT,
        cursor: pg.cursor,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      }),
  })

  const rows = data?.data ?? []

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      sellerOrderService.updateStatus(id, status),
    onSuccess: (updated) => {
      toast.success('Đã cập nhật trạng thái đơn hàng')
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
      if (detail?.id === updated.id) setDetail(updated)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  async function openDetail(id: number) {
    try {
      const order = await sellerOrderService.getOne(id)
      setDetail(order)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('seller.orders.title')}</h1>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t('seller.orders.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); pg.reset() }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); pg.reset() }}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{t('common.all')}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">{t('seller.orders.orderId')}</th>
              <th className="px-4 py-3">{t('seller.orders.customer')}</th>
              <th className="px-4 py-3">{t('seller.orders.total')}</th>
              <th className="px-4 py-3">{t('seller.orders.payment')}</th>
              <th className="px-4 py-3">{t('common.status')}</th>
              <th className="px-4 py-3">{t('common.createdAt')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="py-16 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-gray-400">{t('seller.orders.empty')}</p>
                </td>
              </tr>
            ) : rows.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">#{order.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{order.receiver.name}</p>
                  <p className="text-xs text-gray-400">{order.receiver.phone}</p>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(order.finalAmount)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{order.paymentMethod}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[order.status as OrderStatus] ?? 'secondary'}>
                    {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openDetail(order.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination
          page={pg.page}
          hasPrev={pg.hasPrev}
          hasNext={data?.hasMore ?? false}
          onPrev={pg.prevPage}
          onNext={() => data?.nextCursor != null && pg.nextPage(data.nextCursor)}
          count={rows.length}
        />
      </div>

      {/* Order detail panel */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">Đơn hàng #{detail.id}</h3>
                <Badge variant={STATUS_BADGE[detail.status as OrderStatus] ?? 'secondary'} className="mt-1">
                  {STATUS_LABEL[detail.status as OrderStatus] ?? detail.status}
                </Badge>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Người nhận */}
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Người nhận</p>
                <div className="rounded-lg border border-gray-100 p-3 text-sm space-y-1">
                  <p className="font-medium text-gray-900">{detail.receiver.name}</p>
                  <p className="text-gray-500">{detail.receiver.phone}</p>
                  <p className="text-gray-500">{detail.receiver.address}</p>
                </div>
              </section>

              {/* Sản phẩm */}
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sản phẩm</p>
                <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                        <p className="text-xs text-gray-400">x{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 shrink-0">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tổng tiền */}
              <section className="rounded-lg border border-gray-100 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Phí vận chuyển</span>
                  <span>{formatCurrency(detail.shippingFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(detail.finalAmount)}</span>
                </div>
              </section>

              {/* Action: chuyển trạng thái */}
              {NEXT_STATUS[detail.status as OrderStatus] && (
                <Button
                  className="w-full"
                  onClick={() => updateStatus.mutate({ id: detail.id, status: NEXT_STATUS[detail.status as OrderStatus]! })}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending && <Spinner size="sm" className="mr-1.5" />}
                  Chuyển sang: {STATUS_LABEL[NEXT_STATUS[detail.status as OrderStatus]!]}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
