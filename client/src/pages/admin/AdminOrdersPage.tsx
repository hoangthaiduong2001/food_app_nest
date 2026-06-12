import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useDebounce } from '@/hooks/useDebounce'
import type { OrderStatus } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'

const STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: 'warning',
  PENDING_PICKUP: 'secondary',
  PENDING_DELIVERY: 'default',
  DELIVERED: 'success',
  RETURNED: 'outline',
  CANCELLED: 'destructive',
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING_PICKUP: 'PENDING_DELIVERY',
  PENDING_DELIVERY: 'DELIVERED',
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT', 'PENDING_PICKUP', 'PENDING_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED',
]

const LIMIT = 15

export default function AdminOrdersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  const pg = useCursorPagination(LIMIT)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filterStatus, debouncedSearch, dateFrom, dateTo, pg.cursor],
    queryFn: () =>
      orderService.list({
        status: filterStatus || undefined,
        search: debouncedSearch || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        cursor: pg.cursor,
        limit: LIMIT,
      }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      toast.success(t('adminOrders.updateSuccess'))
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const orders = data?.data ?? []
  const hasNext = data?.hasMore ?? false

  function resetFilters() {
    setFilterStatus('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    pg.reset()
  }

  function handleFilterChange(fn: () => void) {
    fn()
    pg.reset()
  }

  const hasActiveFilters = !!(filterStatus || debouncedSearch || dateFrom || dateTo)

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('adminOrders.title')}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className={showFilters ? 'border-blue-300 text-blue-600' : ''}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t('adminOrders.filters')}
          {hasActiveFilters && (
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder={t('adminOrders.searchPlaceholder')}
                value={search}
                onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
              />
            </div>

            {/* Status */}
            <Select
              value={filterStatus}
              onChange={(e) => handleFilterChange(() => setFilterStatus(e.target.value as OrderStatus | ''))}
            >
              <option value="">{t('admin.allStatuses')}</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`orders.status.${s}`)}</option>
              ))}
            </Select>

            {/* Clear */}
            <Button variant="outline" onClick={resetFilters} disabled={!hasActiveFilters}>
              <X className="mr-2 h-4 w-4" />
              {t('adminOrders.clearFilters')}
            </Button>

            {/* Date from */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{t('adminOrders.dateFrom')}</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterChange(() => setDateFrom(e.target.value))}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{t('adminOrders.dateTo')}</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterChange(() => setDateTo(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-gray-400">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('adminOrders.customer')}</TableHead>
                <TableHead>{t('adminOrders.total')}</TableHead>
                <TableHead>{t('adminOrders.payment')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-gray-500">#{order.id}</TableCell>

                  {/* Customer — dùng user field từ admin API, fallback receiver */}
                  <TableCell className="text-sm">
                    {order.user ? (
                      <>
                        <div className="font-medium text-gray-800">{order.user.name}</div>
                        <div className="text-xs text-gray-400">{order.user.email}</div>
                      </>
                    ) : (
                      <>
                        <div>{order.receiver?.name ?? `User #${order.userId}`}</div>
                        {order.receiver?.phone && (
                          <div className="text-xs text-gray-400">{order.receiver.phone}</div>
                        )}
                      </>
                    )}
                  </TableCell>

                  <TableCell className="font-bold text-blue-600">
                    {formatCurrency(order.finalAmount)}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={order.paymentStatus === 'SUCCESS' ? 'success' : 'warning'}
                      className="text-xs"
                    >
                      {t(`orders.paymentStatus.${order.paymentStatus}`, order.paymentStatus)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[order.status]} className="text-xs">
                      {t(`orders.status.${order.status}`)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm text-gray-400">
                    {formatDate(order.createdAt)}
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-1">
                      {NEXT_STATUS[order.status] && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({ id: order.id, status: NEXT_STATUS[order.status]! })
                          }
                        >
                          → {t(`orders.status.${NEXT_STATUS[order.status]!}`)}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        {t('adminOrders.detail')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <TablePagination
          page={pg.page}
          hasPrev={pg.hasPrev}
          hasNext={hasNext}
          onPrev={pg.prevPage}
          onNext={() => data?.nextCursor && pg.nextPage(data.nextCursor)}
          count={orders.length}
        />
      </div>
    </div>
  )
}
