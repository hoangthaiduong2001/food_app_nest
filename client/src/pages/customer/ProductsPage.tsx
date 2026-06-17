import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, ChevronDown, Package,
  ArrowUpDown, LayoutGrid, LayoutList,
} from 'lucide-react'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { brandService } from '@/services/brand.service'
import { sellerService } from '@/services/seller.service'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import type { ProductListItem, Category, Brand } from '@/types'

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'newest', label: 'Mới nhất' },
]

function getDiscount(price: number, virtual: number) {
  if (virtual <= price) return 0
  return Math.round(((virtual - price) / virtual) * 100)
}

/* ─── Filter sidebar content (dùng chung desktop + mobile drawer) ─── */
function FilterContent({
  categories, brands,
  categoryId, setCategoryId,
  brandId, setBrandId,
  shopName, isLoadingFilters,
  onClose,
}: {
  categories: Pick<Category, 'id' | 'name'>[]
  brands: Pick<Brand, 'id' | 'name' | 'logo'>[]
  categoryId: number | undefined
  setCategoryId: (v: number | undefined) => void
  brandId: number | undefined
  setBrandId: (v: number | undefined) => void
  shopName?: string
  isLoadingFilters?: boolean
  onClose?: () => void
}) {
  const hasFilter = categoryId !== undefined || brandId !== undefined

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div>
          <span className="font-semibold text-gray-900">Bộ lọc</span>
          {shopName && (
            <p className="mt-0.5 text-xs text-orange-500 font-medium">Trong: {shopName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFilter && (
            <button
              onClick={() => { setCategoryId(undefined); setBrandId(undefined) }}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              Xóa tất cả
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Skeleton khi đang load filter của shop */}
      {isLoadingFilters && (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-7 rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {/* Danh mục */}
      {!isLoadingFilters && categories.length > 0 && (
        <FilterSection title="Danh mục">
          <div className="space-y-1">
            <FilterPill
              active={categoryId === undefined}
              onClick={() => setCategoryId(undefined)}
              label="Tất cả"
            />
            {categories.map((c) => (
              <FilterPill
                key={c.id}
                active={categoryId === c.id}
                onClick={() => setCategoryId(c.id === categoryId ? undefined : c.id)}
                label={c.name}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Thương hiệu */}
      {!isLoadingFilters && brands.length > 0 && (
        <FilterSection title="Thương hiệu">
          <div className="flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setBrandId(b.id === brandId ? undefined : b.id)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  brandId === b.id
                    ? 'border-orange-400 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-gray-800"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && children}
    </div>
  )
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
        active
          ? 'bg-orange-50 font-semibold text-orange-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-orange-500'
      }`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border ${active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`} />
      <span className="leading-snug">{label}</span>
    </button>
  )
}

/* ─── Main page ─── */
export default function ProductsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // sellerId + shopName đến từ URL (do ProductDetailPage navigate sang)
  const sellerIdFromUrl = searchParams.get('sellerId') ? Number(searchParams.get('sellerId')) : undefined
  const shopNameFromUrl = searchParams.get('shop') ?? undefined

  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [categoryId, setCategoryId] = useState<number | undefined>(
    searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined
  )
  const [brandId, setBrandId] = useState<number | undefined>(
    searchParams.get('brandId') ? Number(searchParams.get('brandId')) : undefined
  )
  const [sort, setSort] = useState(searchParams.get('sort') ?? '')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  const loaderRef = useRef<HTMLDivElement>(null)

  // Sync URL params — sellerId/shop KHÔNG được ghi vào đây vì chúng read-only từ URL
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        // Giữ nguyên sellerId và shop nếu có
        if (debouncedSearch) p.set('q', debouncedSearch)
        else p.delete('q')
        if (categoryId) p.set('categoryId', String(categoryId))
        else p.delete('categoryId')
        if (brandId) p.set('brandId', String(brandId))
        else p.delete('brandId')
        if (sort) p.set('sort', sort)
        else p.delete('sort')
        return p
      },
      { replace: true },
    )
  }, [debouncedSearch, categoryId, brandId, sort, setSearchParams])

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.list(),
    enabled: !sellerIdFromUrl,
  })
  const { data: allBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: brandService.list,
    enabled: !sellerIdFromUrl,
  })

  // Shop mode: lấy categories/brands của seller từ API riêng
  const { data: sellerFilters, isLoading: isLoadingSellerProducts } = useQuery({
    queryKey: ['seller-filters', sellerIdFromUrl],
    queryFn: () => sellerService.getFilters(sellerIdFromUrl!),
    enabled: !!sellerIdFromUrl,
    staleTime: 5 * 60 * 1000,
  })

  const categories = sellerIdFromUrl ? (sellerFilters?.categories ?? []) : (allCategories ?? [])
  const brands = sellerIdFromUrl ? (sellerFilters?.brands ?? []) : (allBrands ?? [])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['products', debouncedSearch, categoryId, brandId, sort, sellerIdFromUrl],
    queryFn: ({ pageParam }) =>
      productService.list({
        q: debouncedSearch || undefined,
        categoryId,
        brandId,
        sellerId: sellerIdFromUrl,
        limit: 20,
        cursor: pageParam as number | undefined,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  })

  const rawProducts = data?.pages.flatMap((p) => p.data) ?? []

  // Client-side sort (vì BE chưa có sort param)
  const products = [...rawProducts].sort((a, b) => {
    if (sort === 'price_asc') return a.basePrice - b.basePrice
    if (sort === 'price_desc') return b.basePrice - a.basePrice
    if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return 0
  })

  const totalCount = data?.pages[0] ? rawProducts.length : 0
  const activeFiltersCount = (categoryId ? 1 : 0) + (brandId ? 1 : 0) + (search ? 1 : 0)
  const activeCatName = categories?.find((c) => c.id === categoryId)?.name
  const activeBrandName = brands?.find((b) => b.id === brandId)?.name

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasNextPage) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage() },
      { threshold: 0.1 },
    )
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="min-h-screen">
      {/* ── Top bar ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {shopNameFromUrl ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/products')}
                  className="text-sm text-gray-400 hover:text-orange-500 transition-colors"
                >
                  Tất cả sản phẩm
                </button>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-gray-700">{shopNameFromUrl}</span>
              </div>
              <h1 className="mt-0.5 text-xl font-bold text-gray-900">
                Shop: {shopNameFromUrl}
              </h1>
              {!isLoading && (
                <p className="text-sm text-gray-400">{totalCount} sản phẩm trong shop này</p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">
                {activeCatName ?? 'Tất cả sản phẩm'}
              </h1>
              {!isLoading && (
                <p className="text-sm text-gray-400">
                  {activeCatName && activeBrandName
                    ? `${activeCatName} · ${activeBrandName}`
                    : activeBrandName ?? activeCatName ?? 'Khám phá hàng nghìn sản phẩm'}
                </p>
              )}
            </>
          )}
        </div>
        {/* Search bar */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {activeFiltersCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Đang lọc:</span>
          {search && (
            <Chip label={`"${search}"`} onRemove={() => setSearch('')} />
          )}
          {activeCatName && (
            <Chip label={activeCatName} onRemove={() => setCategoryId(undefined)} />
          )}
          {activeBrandName && (
            <Chip label={activeBrandName} onRemove={() => setBrandId(undefined)} />
          )}
          <button
            onClick={() => { setSearch(''); setCategoryId(undefined); setBrandId(undefined) }}
            className="text-xs text-orange-500 hover:underline"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      <div className="flex gap-5">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <FilterContent
              categories={categories ?? []}
              brands={brands ?? []}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              brandId={brandId}
              setBrandId={setBrandId}
              shopName={shopNameFromUrl}
              isLoadingFilters={!!sellerIdFromUrl && isLoadingSellerProducts}
            />
          </div>
        </aside>

        {/* ── Right column ── */}
        <div className="min-w-0 flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            {/* Mobile filter button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm transition hover:border-orange-300 hover:text-orange-500 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Bộ lọc
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {!isLoading && products.length > 0 && (
              <p className="hidden text-sm text-gray-400 lg:block">{products.length} sản phẩm</p>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-8 rounded-full border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* View toggle */}
              <div className="hidden items-center gap-1 rounded-full border border-gray-200 bg-white p-0.5 sm:flex">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-full p-1.5 transition ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-full p-1.5 transition ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Product grid / list */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white">
                  <div className="aspect-square rounded-t-xl bg-gray-100" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 rounded bg-gray-100" />
                    <div className="h-3 w-2/3 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
              <Package className="h-14 w-14 text-gray-200" />
              <div>
                <p className="font-semibold text-gray-500">Không tìm thấy sản phẩm</p>
                <p className="mt-1 text-sm text-gray-400">Thử thay đổi từ khóa hoặc bộ lọc</p>
              </div>
              <button
                onClick={() => { setSearch(''); setCategoryId(undefined); setBrandId(undefined) }}
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                {shopNameFromUrl ? 'Xem tất cả sản phẩm shop' : 'Xóa bộ lọc'}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {products.map((p) => (
                <GridCard key={p.id} product={p} onClick={() => navigate(`/products/${p.id}`)} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ListCard key={p.id} product={p} onClick={() => navigate(`/products/${p.id}`)} />
              ))}
            </div>
          )}

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="mt-6 flex justify-center py-4">
            {isFetchingNextPage && <Spinner size="sm" />}
            {!hasNextPage && products.length > 0 && (
              <p className="text-sm text-gray-400">Đã hiển thị tất cả {products.length} sản phẩm</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl">
            <FilterContent
              categories={categories ?? []}
              brands={brands ?? []}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              brandId={brandId}
              setBrandId={setBrandId}
              shopName={shopNameFromUrl}
              isLoadingFilters={!!sellerIdFromUrl && isLoadingSellerProducts}
              onClose={() => setMobileFilterOpen(false)}
            />
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="mt-4 w-full rounded-full bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600"
            >
              Xem kết quả {products.length > 0 ? `(${products.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Product cards ── */

function GridCard({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const price = product.basePrice
  const discount = getDiscount(price, product.virtualPrice)
  const isOutOfStock = product.totalStock === 0

  return (
    <div
      onClick={isOutOfStock ? undefined : onClick}
      className={`group overflow-hidden rounded-xl border border-gray-100 bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
        isOutOfStock ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.images[0]
          ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-5xl">🛍️</div>
        }
        {discount > 0 && !isOutOfStock && (
          <div className="absolute left-1.5 top-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-gray-600">Hết hàng</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm text-gray-700">{product.name}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <span className="font-bold text-orange-500">{formatCurrency(price)}</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatCurrency(product.virtualPrice)}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className="text-xs text-yellow-400">★</span>
          ))}
          <span className="ml-1 text-xs text-gray-400">99+</span>
        </div>
      </div>
    </div>
  )
}

function ListCard({ product, onClick }: { product: ProductListItem; onClick: () => void }) {
  const price = product.basePrice
  const discount = getDiscount(price, product.virtualPrice)
  const isOutOfStock = product.totalStock === 0

  return (
    <div
      onClick={isOutOfStock ? undefined : onClick}
      className={`group flex gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-3 transition hover:shadow-md ${
        isOutOfStock ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50">
        {product.images[0]
          ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-3xl">🛍️</div>
        }
        {discount > 0 && !isOutOfStock && (
          <div className="absolute left-1 top-1 rounded-md bg-orange-500 px-1 py-0.5 text-xs font-bold text-white">
            -{discount}%
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium text-gray-800">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{product.description}</p>
        )}
        <div className="mt-2 flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => <span key={s} className="text-xs text-yellow-400">★</span>)}
          <span className="ml-1 text-xs text-gray-400">99+</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-orange-500">{formatCurrency(price)}</span>
            {discount > 0 && (
              <span className="text-sm text-gray-400 line-through">{formatCurrency(product.virtualPrice)}</span>
            )}
          </div>
          {isOutOfStock
            ? <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">Hết hàng</span>
            : <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-500">Mua ngay</span>
          }
        </div>
      </div>
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
      {label}
      <button onClick={onRemove} className="hover:text-orange-900">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
