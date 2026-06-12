import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { orderService } from '@/services/order.service';
import type { OrderListItem, OrderStatus } from '@/types';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline';

const STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: 'warning',
  PENDING_PICKUP: 'secondary',
  PENDING_DELIVERY: 'default',
  DELIVERED: 'success',
  RETURNED: 'outline',
  CANCELLED: 'destructive',
};

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PENDING_PICKUP',
  'PENDING_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
];

export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrderStatus | ''>('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['orders', activeTab],
      queryFn: ({ pageParam }) =>
        orderService.list({
          status: activeTab || undefined,
          cursor: pageParam as number | undefined,
        }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (last) =>
        last.hasMore ? (last.nextCursor ?? undefined) : undefined,
    });

  const cancelOrder = useMutation({
    mutationFn: (id: number) => orderService.updateStatus(id, 'CANCELLED'),
    onSuccess: () => {
      toast.success(t('orders.cancelSuccess'));
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const payOrder = useMutation({
    mutationFn: (id: number) => orderService.pay(id),
    onSuccess: () => {
      toast.success(t('orders.paySuccess'));
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const orders = data?.pages.flatMap((p) => p.data) ?? [];

  const TAB_STYLES: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'text-yellow-600 border-yellow-500',
    PENDING_PICKUP: 'text-gray-600 border-gray-500',
    PENDING_DELIVERY: 'text-blue-600 border-blue-500',
    DELIVERED: 'text-green-600 border-green-500',
    RETURNED: 'text-orange-500 border-orange-400',
    CANCELLED: 'text-red-500 border-red-400',
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        {t('orders.title')}
      </h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav
          className="flex gap-1 overflow-x-auto overflow-y-hidden"
          aria-label="Order status tabs"
        >
          <button
            onClick={() => setActiveTab('')}
            className={[
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === ''
                ? 'text-blue-600 border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {t('common.all')}
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={[
                'whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === s
                  ? TAB_STYLES[s]
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {t(`orders.status.${s}`)}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Package className="h-16 w-16 text-gray-200" />
          <p className="text-gray-500">{t('orders.noOrders')}</p>
          <Button onClick={() => navigate('/products')}>
            {t('nav.products')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={() => cancelOrder.mutate(order.id)}
              onPay={() => payOrder.mutate(order.id)}
              onDetail={() => navigate(`/orders/${order.id}`)}
            />
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && <Spinner size="sm" className="mr-2" />}
                {t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onCancel,
  onPay,
  onDetail,
}: {
  order: OrderListItem;
  onCancel: () => void;
  onPay: () => void;
  onDetail: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {t('orders.orderNumber', { id: order.id })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[order.status]}>
          {t(`orders.status.${order.status}`)}
        </Badge>
      </div>

      {/* Receiver info */}
      <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
        <span className="font-medium">{order.receiver.name}</span>
        <span className="mx-1.5 text-gray-300">·</span>
        <span>{order.receiver.phone}</span>
        <span className="mx-1.5 text-gray-300">·</span>
        <span className="text-gray-400 truncate">{order.receiver.address}</span>
      </div>

      {/* Payment badge */}
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        <span>{t('adminOrders.payment')}:</span>
        <Badge
          variant={order.paymentStatus === 'SUCCESS' ? 'success' : 'warning'}
          className="text-xs"
        >
          {t(
            `orders.paymentStatus.${order.paymentStatus}`,
            order.paymentStatus,
          )}
        </Badge>
        <span className="text-gray-300">·</span>
        <span>{order.paymentMethod}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-50 pt-3">
        <span className="text-lg font-bold text-blue-600">
          {formatCurrency(order.finalAmount)}
        </span>
        <div className="flex gap-2">
          {order.status === 'PENDING_PAYMENT' && (
            <Button size="sm" onClick={onPay}>
              {t('orders.pay')}
            </Button>
          )}
          {order.status === 'PENDING_PAYMENT' && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              {t('orders.cancel')}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDetail}>
            {t('orders.detail')}
          </Button>
        </div>
      </div>
    </div>
  );
}
