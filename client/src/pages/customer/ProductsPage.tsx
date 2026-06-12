import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { brandService } from '@/services/brand.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

export default function ProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [brandId, setBrandId] = useState<number | undefined>()

  const debouncedSearch = useDebounce(search, 400)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.list() })
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandService.list })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['products', debouncedSearch, categoryId, brandId],
    queryFn: ({ pageParam }) =>
      productService.list({
        q: debouncedSearch || undefined,
        categoryId,
        brandId,
        limit: 20,
        cursor: pageParam as number | undefined,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  })

  const products = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('products.title')}</h1>
        <p className="text-gray-500 mt-1">{t('products.subtitle')}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t('products.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-48"
          value={categoryId?.toString() ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">{t('products.allCategories')}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select
          className="w-48"
          value={brandId?.toString() ?? ''}
          onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">{t('products.allBrands')}</option>
          {brands?.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>
        <Button
          variant="outline"
          onClick={() => { setSearch(''); setCategoryId(undefined); setBrandId(undefined) }}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t('products.clearFilters')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center text-gray-500">{t('products.noProducts')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/products/${product.id}`)}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Spinner size="sm" className="mr-2" /> : null}
                {t('common.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const { t } = useTranslation()
  const variants = product.variants ?? []
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]
  const price = defaultVariant?.price ?? product.basePrice

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="aspect-square overflow-hidden bg-gray-50">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Smartphone className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-gray-800">{product.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-bold text-blue-600">{formatCurrency(price)}</span>
          {product.virtualPrice > price && (
            <span className="text-xs text-gray-400 line-through">{formatCurrency(product.virtualPrice)}</span>
          )}
        </div>
        {product.totalStock === 0 && (
          <Badge variant="secondary" className="mt-1 text-xs">{t('products.outOfStock')}</Badge>
        )}
      </div>
    </div>
  )
}
