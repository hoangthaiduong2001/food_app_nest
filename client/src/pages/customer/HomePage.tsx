import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Smartphone, Truck, ShieldCheck, Headphones, TabletSmartphone } from 'lucide-react'
import { productService } from '@/services/product.service'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

const features = [
  { icon: Truck, label: 'Giao nhanh', desc: 'Nhận hàng trong ngày' },
  { icon: ShieldCheck, label: 'Chính hãng', desc: 'Bảo hành rõ ràng' },
  { icon: Headphones, label: 'Tư vấn kỹ thuật', desc: 'Chọn đúng nhu cầu' },
]

export default function HomePage() {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['products-featured'],
    queryFn: () => productService.list({ limit: 8 }),
  })

  const products = data?.data ?? []

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-slate-950 text-white">
        <div className="grid gap-8 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-12">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm mb-4">
            <Smartphone className="h-4 w-4" />
            Thiết bị mới mỗi ngày
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Điện thoại, tablet <br />và phụ kiện công nghệ
          </h1>
          <p className="text-blue-100 mb-6 text-lg">
            Mua sắm thiết bị chính hãng từ các thương hiệu uy tín, giá rõ ràng và giao hàng tận nơi.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => navigate('/products')}
            >
              Xem sản phẩm
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20"
              onClick={() => navigate('/register')}
            >
              Tạo tài khoản
            </Button>
          </div>
        </div>
        <div className="relative hidden min-h-64 items-center justify-center md:flex">
          <div className="absolute h-56 w-56 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-4">
            <div className="flex h-56 w-32 items-center justify-center rounded-[1.75rem] border border-white/20 bg-white/10 shadow-2xl backdrop-blur">
              <Smartphone className="h-20 w-20 text-blue-100" />
            </div>
            <div className="mt-10 flex h-44 w-36 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur">
              <TabletSmartphone className="h-20 w-20 text-cyan-100" />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-xl bg-white border border-gray-100 p-4 text-center shadow-sm">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Featured products */}
      {products.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
            <Button variant="ghost" onClick={() => navigate('/products')}>Xem tất cả</Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <FeaturedCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/products/${product.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FeaturedCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const price = (product.variants ?? []).find((v) => v.isDefault)?.price ?? product.basePrice
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-square overflow-hidden bg-gray-50">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Smartphone className="h-14 w-14" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        <p className="mt-1 font-bold text-blue-600">{formatCurrency(price)}</p>
      </div>
    </div>
  )
}
