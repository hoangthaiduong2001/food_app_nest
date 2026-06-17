import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Truck, ShieldCheck, Headphones, ChevronRight,
  Zap, RefreshCw, Package,
} from 'lucide-react'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { brandService } from '@/services/brand.service'
import { formatCurrency } from '@/lib/utils'
import type { ProductListItem, Category, Brand } from '@/types'

// Map keyword → emoji, bao phủ đa ngành
const CAT_ICON_MAP: [string, string][] = [
  // Điện tử
  ['điện thoại', '📱'], ['phone', '📱'], ['mobile', '📱'],
  ['laptop', '💻'], ['máy tính', '💻'], ['computer', '💻'],
  ['tablet', '📲'], ['máy tính bảng', '📲'],
  ['tai nghe', '🎧'], ['headphone', '🎧'],
  ['màn hình', '🖥️'], ['monitor', '🖥️'],
  ['bàn phím', '⌨️'], ['keyboard', '⌨️'],
  ['chuột', '🖱️'], ['mouse', '🖱️'],
  ['camera', '📷'], ['máy ảnh', '📷'],
  ['loa', '🔊'], ['speaker', '🔊'],
  ['sạc', '🔋'], ['charger', '🔋'], ['pin', '🔋'],
  ['ổ cứng', '💾'], ['storage', '💾'], ['ssd', '💾'],
  ['tivi', '📺'], ['tv', '📺'], ['smart tv', '📺'],
  ['gaming', '🎮'], ['game', '🎮'],
  // Gia dụng
  ['tủ lạnh', '🧊'], ['fridge', '🧊'],
  ['máy giặt', '🫧'], ['washing', '🫧'],
  ['điều hòa', '❄️'], ['air con', '❄️'],
  ['máy hút bụi', '🧹'], ['vacuum', '🧹'],
  ['nồi', '🍲'], ['nấu', '🍲'], ['bếp', '🍳'],
  ['máy pha cà phê', '☕'], ['coffee', '☕'],
  ['ấm đun', '🫖'], ['kettle', '🫖'],
  ['quạt', '💨'], ['fan', '💨'],
  ['đèn', '💡'], ['lamp', '💡'], ['light', '💡'],
  // Thời trang & phụ kiện
  ['áo', '👕'], ['quần', '👖'], ['shirt', '👕'],
  ['giày', '👟'], ['dép', '🩴'], ['shoe', '👟'],
  ['túi', '👜'], ['ba lô', '🎒'], ['bag', '👜'],
  ['đồng hồ', '⌚'], ['watch', '⌚'],
  ['kính', '🕶️'], ['glasses', '🕶️'],
  ['trang sức', '💍'], ['jewelry', '💍'],
  // Sức khỏe & làm đẹp
  ['mỹ phẩm', '💄'], ['makeup', '💄'], ['son', '💄'],
  ['kem', '🧴'], ['cream', '🧴'], ['skincare', '🧴'],
  ['nước hoa', '🌸'], ['perfume', '🌸'],
  ['vitamin', '💊'], ['thuốc', '💊'], ['sức khỏe', '💊'],
  ['thể thao', '🏃'], ['sport', '🏃'], ['gym', '🏋️'],
  // Đồ ăn & thức uống
  ['thực phẩm', '🛒'], ['food', '🛒'],
  ['đồ uống', '🥤'], ['drink', '🥤'],
  ['bánh', '🍰'], ['kẹo', '🍬'],
  // Nhà cửa
  ['nội thất', '🛋️'], ['furniture', '🛋️'],
  ['đồ dùng nhà', '🏠'], ['home', '🏠'],
  ['vệ sinh', '🧽'], ['cleaning', '🧽'],
  // Trẻ em
  ['đồ chơi', '🧸'], ['toy', '🧸'], ['trẻ em', '🧸'],
  ['sách', '📚'], ['book', '📚'],
  // Xe cộ
  ['xe', '🚗'], ['car', '🚗'], ['ô tô', '🚗'],
  ['xe máy', '🏍️'], ['motor', '🏍️'],
  // Thú cưng
  ['thú cưng', '🐾'], ['pet', '🐾'],
]

function getCatIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, icon] of CAT_ICON_MAP) {
    if (lower.includes(key)) return icon
  }
  return '📦'
}

const TRUST_BADGES = [
  { icon: Truck, label: 'Giao hàng nhanh', desc: 'Miễn phí từ 300K', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: ShieldCheck, label: 'Hàng chính hãng', desc: 'Cam kết 100%', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: RefreshCw, label: 'Đổi trả dễ dàng', desc: 'Trong vòng 7 ngày', color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: Headphones, label: 'Hỗ trợ 24/7', desc: 'Tư vấn tận tình', color: 'text-orange-500', bg: 'bg-orange-50' },
]

// Các banner hero xoay vòng (static, không cần API)
const HERO_BANNERS = [
  {
    gradient: 'from-orange-500 via-red-500 to-rose-600',
    badge: '🔥 Siêu sale cuối tuần',
    title: 'Mua sắm thả ga\ngiá không lo',
    sub: 'Hàng nghìn sản phẩm đa dạng, giao hàng tận nơi toàn quốc.',
    cta: 'Khám phá ngay',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  const { data: productData } = useQuery({
    queryKey: ['products-featured'],
    queryFn: () => productService.list({ limit: 20 }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-home'],
    queryFn: () => categoryService.list(),
  })

  const { data: brands } = useQuery({
    queryKey: ['brands-home'],
    queryFn: () => brandService.list(),
  })

  const products = productData?.data ?? []
  const allCats = categories ?? []
  const topCats = allCats.slice(0, 12)
  const topBrands = (brands ?? []).filter((b) => b.logo).slice(0, 8)
  const flashProducts = products.slice(0, 8)
  const gridProducts = products

  const hero = HERO_BANNERS[0]

  return (
    <div className="space-y-4">

      {/* ── Hero ── */}
      <div className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${hero.gradient} px-8 py-10 md:px-12`}>
        {/* Decorative circles */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 right-40 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute bottom-6 right-12 h-28 w-28 rounded-full bg-white/5" />
        </div>

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
              <Zap className="h-3.5 w-3.5" /> {hero.badge}
            </span>
            <h1 className="mb-3 whitespace-pre-line text-3xl font-extrabold leading-tight text-white md:text-4xl">
              {hero.title}
            </h1>
            <p className="mb-6 text-base text-white/80">{hero.sub}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/products')}
                className="rounded-full bg-white px-7 py-2.5 text-sm font-bold text-orange-600 shadow-md transition hover:scale-105 hover:bg-orange-50"
              >
                {hero.cta}
              </button>
              <button
                onClick={() => navigate('/register')}
                className="rounded-full border border-white/50 bg-white/10 px-7 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Đăng ký miễn phí
              </button>
            </div>
          </div>

          {/* Floating product previews */}
          {flashProducts.length >= 3 && (
            <div className="hidden shrink-0 md:flex md:items-end md:gap-3">
              {flashProducts.slice(0, 3).map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/products/${p.id}`)}
                  className={`overflow-hidden rounded-2xl bg-white/20 shadow-xl backdrop-blur transition hover:scale-105 ${
                    i === 1 ? 'mb-6 h-36 w-28' : 'h-28 w-22'
                  }`}
                >
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-3xl">🛍️</div>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Trust badges ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TRUST_BADGES.map(({ icon: Icon, label, desc, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
              <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Danh mục ── */}
      {topCats.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Danh mục" onMore={() => navigate('/products')} />
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 sm:grid-cols-6 md:grid-cols-12">
            {topCats.map((cat: Category) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?categoryId=${cat.id}`)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl transition group-hover:scale-110 group-hover:bg-orange-100">
                  {cat.logo
                    ? <img src={cat.logo} alt={cat.name} className="h-9 w-9 object-contain" />
                    : <span>{getCatIcon(cat.name)}</span>
                  }
                </div>
                <p className="line-clamp-2 text-center text-xs text-gray-600 group-hover:text-orange-600">
                  {cat.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Flash sale ── */}
      {flashProducts.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-linear-to-r from-orange-500 to-rose-500 px-5 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4.5 w-4.5 text-white" />
              <span className="font-bold text-white">Flash Sale</span>
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                Kết thúc lúc 24:00
              </span>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="flex items-center gap-0.5 text-xs font-medium text-white/80 hover:text-white"
            >
              Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide">
            {flashProducts.map((p) => (
              <FlashCard key={p.id} product={p} onClick={() => navigate(`/products/${p.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Thương hiệu ── */}
      {topBrands.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Thương hiệu nổi bật" />
          <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
            {topBrands.map((brand: Brand) => (
              <button
                key={brand.id}
                onClick={() => navigate(`/products?brandId=${brand.id}`)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className="flex h-14 w-full items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-2 transition group-hover:border-orange-200 group-hover:bg-orange-50">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-8 w-full object-contain grayscale transition group-hover:grayscale-0"
                  />
                </div>
                <p className="text-xs text-gray-500 group-hover:text-orange-600">{brand.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Gợi ý hôm nay ── */}
      {gridProducts.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Gợi ý hôm nay" onMore={() => navigate('/products')} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {gridProducts.map((p) => (
              <ProductCard key={p.id} product={p} onClick={() => navigate(`/products/${p.id}`)} />
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => navigate('/products')}
              className="rounded-full border border-orange-300 px-8 py-2 text-sm font-semibold text-orange-500 transition hover:bg-orange-50"
            >
              Xem thêm sản phẩm
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {gridProducts.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Package className="h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-400">Chưa có sản phẩm nào. Hãy quay lại sau!</p>
        </div>
      )}
    </div>
  )
}

/* ── Shared sub-components ── */

function SectionHeader({ title, onMore }: { title: string; onMore?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-orange-500" />
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {onMore && (
        <button
          onClick={onMore}
          className="flex items-center gap-0.5 text-xs font-medium text-orange-500 hover:text-orange-600"
        >
          Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function FlashCard({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const price = product.basePrice
  const original = product.virtualPrice > price ? product.virtualPrice : Math.round(price * 1.2)
  const discount = Math.round(((original - price) / original) * 100)
  const soldPct = 60 // placeholder

  return (
    <div
      onClick={onClick}
      className="group w-36 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
        }
        <div className="absolute left-1.5 top-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
          -{discount}%
        </div>
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-xs text-gray-700">{product.name}</p>
        <p className="mt-1 text-sm font-bold text-orange-500">{formatCurrency(price)}</p>
        <p className="text-xs text-gray-400 line-through">{formatCurrency(original)}</p>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-1.5 rounded-full bg-linear-to-r from-orange-400 to-red-400"
            style={{ width: `${soldPct}%` }}
          />
        </div>
        <p className="mt-0.5 text-xs text-orange-500">Đã bán {soldPct}%</p>
      </div>
    </div>
  )
}

function ProductCard({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const price = product.basePrice
  const original = product.virtualPrice > price ? product.virtualPrice : Math.round(price * 1.15)
  const discount = Math.round(((original - price) / original) * 100)

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.images?.[0]
          ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          )
          : <div className="flex h-full items-center justify-center text-5xl">🛍️</div>
        }
        {discount > 0 && (
          <div className="absolute right-1.5 top-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm text-gray-700">{product.name}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <span className="font-bold text-orange-500">{formatCurrency(price)}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatCurrency(original)}</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className="text-xs text-yellow-400">★</span>
          ))}
          <span className="ml-1 text-xs text-gray-400">Đã bán 99+</span>
        </div>
      </div>
    </div>
  )
}
