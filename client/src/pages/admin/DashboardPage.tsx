import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Package, TrendingUp, Users } from 'lucide-react'
import { orderService } from '@/services/order.service'
import { productService } from '@/services/product.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'

export default function DashboardPage() {
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => orderService.list({ limit: 5 }),
  })

  const { data: products } = useQuery({
    queryKey: ['products-count'],
    queryFn: () => productService.list({ limit: 1 }),
  })

  const stats = [
    {
      label: 'Đơn hàng',
      value: orders?.data?.length ?? 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Thiết bị',
      value: products?.data?.length ?? 0,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Doanh thu tạm tính',
      value: formatCurrency(orders?.data?.reduce((s, o) => s + o.finalAmount, 0) ?? 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Người dùng',
      value: '—',
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tổng quan cửa hàng</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`rounded-full p-3 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="space-y-3">
              {orders?.data?.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between text-sm p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <span className="font-medium">Đơn #{order.id}</span>
                    <span className="ml-3 text-gray-400">{order.status}</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatCurrency(order.finalAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
