import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Phone, User, CreditCard, Truck, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
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

// Track tiến trình theo thứ tự status
const STATUS_STEPS: OrderStatus[] = [
  'PENDING_PAYMENT', 'PENDING_PICKUP', 'PENDING_DELIVERY', 'DELIVERED',
]

export default function OrderDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.get(Number(id)),
    enabled: !!id,
  })

  const pay = useMutation({
    mutationFn: () => orderService.pay(Number(id)),
    onSuccess: () => {
      toast.success(t('orders.paySuccess'))
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const cancel = useMutation({
    mutationFn: () => orderService.updateStatus(Number(id), 'CANCELLED'),
    onSuccess: () => {
      toast.success(t('orders.cancelSuccess'))
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!order) return <div className="py-20 text-center text-gray-500">{t('common.noData')}</div>

  const currentStepIndex = STATUS_STEPS.indexOf(order.status)
  const isTerminal = order.status === 'CANCELLED' || order.status === 'RETURNED'

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/orders')} className="mb-4 -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('orders.title')}
      </Button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('orders.orderNumber', { id: order.id })}
          </h1>
          <p className="mt-1 text-sm text-gray-400">{formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[order.status]} className="text-sm px-3 py-1">
          {t(`orders.status.${order.status}`)}
        </Badge>
      </div>

      {/* Progress stepper — chỉ hiện khi không bị huỷ/hoàn trả */}
      {!isTerminal && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const done = currentStepIndex > i
              const active = currentStepIndex === i
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={[
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                      done ? 'bg-blue-600 text-white'
                        : active ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600'
                        : 'bg-gray-100 text-gray-400',
                    ].join(' ')}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={[
                      'text-center text-xs leading-tight max-w-16',
                      active ? 'font-semibold text-blue-600' : done ? 'text-gray-600' : 'text-gray-400',
                    ].join(' ')}>
                      {t(`orders.status.${step}`)}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={[
                      'mx-1 mb-5 h-0.5 flex-1 transition-colors',
                      done ? 'bg-blue-600' : 'bg-gray-200',
                    ].join(' ')} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">{t('nav.products')}</h2>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300 text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold text-gray-800">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Receiver */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-900">{t('checkout.recipientInfo')}</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-gray-600">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{order.receiver.name}</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{order.receiver.phone}</span>
              </div>
              <div className="flex items-start gap-2.5 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span>{order.receiver.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">{t('checkout.orderSummary')}</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('cart.subtotal')}</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t('cart.shippingFee')}</span>
                <span>
                  {order.shippingFee > 0 ? formatCurrency(order.shippingFee) : (
                    <span className="text-green-600">Free</span>
                  )}
                </span>
              </div>
              {order.vatAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>VAT ({order.vatRate}%)</span>
                  <span>{formatCurrency(order.vatAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
                <span>{t('cart.total')}</span>
                <span className="text-blue-600">{formatCurrency(order.finalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-900">{t('adminOrders.payment')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span>{order.paymentMethod}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <Badge
                  variant={order.paymentStatus === 'SUCCESS' ? 'success' : 'warning'}
                  className="text-xs"
                >
                  {t(`orders.paymentStatus.${order.paymentStatus}`, order.paymentStatus)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          {order.status === 'PENDING_PAYMENT' && (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => pay.mutate()} disabled={pay.isPending}>
                {pay.isPending && <Spinner size="sm" className="mr-2" />}
                {t('orders.pay')}
              </Button>
              <Button
                variant="outline" className="w-full"
                onClick={() => cancel.mutate()} disabled={cancel.isPending}
              >
                {cancel.isPending && <Spinner size="sm" className="mr-2" />}
                {t('orders.cancel')}
              </Button>
            </div>
          )}

          {order.status === 'DELIVERED' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const blob = await orderService.downloadInvoice(order.id)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `invoice-order-${order.id}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  toast.error('Failed to download invoice')
                }
              }}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
