import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Search, Package, X } from 'lucide-react'
import { sellerProductService } from '@/services/seller-product.service'
import { brandService } from '@/services/brand.service'
import { categoryService } from '@/services/category.service'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import { useDebounce } from '@/hooks/useDebounce'
import { TablePagination } from '@/components/ui/table-pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { ProductListItem } from '@/types'

// Dùng string cho tất cả number fields để tránh conflict zodResolver với z.preprocess
type FormValues = {
  name: string
  description: string
  basePrice: string
  virtualPrice: string
  stock: string
  brandId: string
  isActive: boolean
  images: string
  categoryIds: string
  sku: string
  variantPrice: string
}

const LIMIT = 15

export default function SellerProductsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null)
  const debouncedSearch = useDebounce(search, 400)
  const pg = useCursorPagination(LIMIT)

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-products', debouncedSearch, pg.cursor],
    queryFn: () => sellerProductService.list({ q: debouncedSearch || undefined, limit: LIMIT, cursor: pg.cursor }),
  })

  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandService.list })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoryService.list() })

  const rows = data?.data ?? []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { isActive: true, stock: '0', basePrice: '0', virtualPrice: '0', brandId: '0' },
  })

  function openCreate() {
    setEditProduct(null)
    reset({ isActive: true, stock: '0', basePrice: '0', virtualPrice: '0', brandId: '0', description: '', images: '', categoryIds: '', sku: '', variantPrice: '', name: '' })
    setModalOpen(true)
  }

  function openEdit(p: ProductListItem) {
    setEditProduct(p)
    reset({
      name: p.name,
      description: p.description ?? '',
      basePrice: String(p.basePrice),
      virtualPrice: String(p.virtualPrice),
      stock: String(p.totalStock),
      brandId: String(p.brandId),
      isActive: p.isActive,
      images: p.images.join(', '),
      categoryIds: '',
      sku: '',
      variantPrice: '',
    })
    setModalOpen(true)
  }

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const basePrice = parseFloat(values.basePrice) || 0
      const virtualPrice = parseFloat(values.virtualPrice) || 0
      const stock = parseInt(values.stock) || 0
      const brandId = parseInt(values.brandId) || 0
      const images = values.images.split(',').map((s) => s.trim()).filter(Boolean)
      const categoryIds = values.categoryIds
        .split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))

      if (!values.name.trim()) throw new Error('Tên sản phẩm là bắt buộc')
      if (brandId < 1) throw new Error('Vui lòng chọn thương hiệu')

      const base = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        basePrice,
        virtualPrice,
        stock,
        brandId,
        isActive: values.isActive,
        images,
        categoryIds,
      }
      if (editProduct) return sellerProductService.update(editProduct.id, base)
      // Create: thêm variant mặc định nếu có SKU
      const variants = values.sku.trim()
        ? [{ sku: values.sku.trim(), price: parseFloat(values.variantPrice) || basePrice, stock, isDefault: true, isActive: true }]
        : []
      return sellerProductService.create({ ...base, variants })
    },
    onSuccess: () => {
      toast.success(editProduct ? t('seller.products.updateSuccess') : t('seller.products.createSuccess'))
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      setModalOpen(false)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => sellerProductService.remove(id),
    onSuccess: () => {
      toast.success(t('seller.products.deleteSuccess'))
      qc.invalidateQueries({ queryKey: ['seller-products'] })
      setDeleteTarget(null)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('seller.products.title')}</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('seller.products.add')}
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder={t('seller.products.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); pg.reset() }}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">{t('seller.products.product')}</th>
              <th className="px-4 py-3">{t('seller.products.price')}</th>
              <th className="px-4 py-3">{t('seller.products.stock')}</th>
              <th className="px-4 py-3">{t('common.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="py-16 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                  <p className="text-gray-400">{t('seller.products.empty')}</p>
                </td>
              </tr>
            ) : rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate max-w-48">{p.name}</p>
                      {p.slug && <p className="text-xs text-gray-400 truncate">/{p.slug}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{formatCurrency(p.basePrice)}</p>
                  {p.virtualPrice !== p.basePrice && (
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(p.virtualPrice)}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{p.totalStock.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.isActive ? 'success' : 'secondary'}>
                    {p.isActive ? t('seller.products.active') : t('seller.products.inactive')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">
                {editProduct ? t('seller.products.edit') : t('seller.products.create')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>{t('seller.products.name')} *</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>{t('seller.products.description')}</Label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('seller.products.basePrice')} *</Label>
                  <Input type="number" min={0} {...register('basePrice')} />
                  {errors.basePrice && <p className="text-xs text-red-500">{errors.basePrice.message as string}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('seller.products.virtualPrice')}</Label>
                  <Input type="number" min={0} {...register('virtualPrice')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('seller.products.stock')}</Label>
                  <Input type="number" min={0} {...register('stock')} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('seller.products.brand')} *</Label>
                  <select {...register('brandId')} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={0}>{t('seller.products.selectBrand')}</option>
                    {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.brandId && <p className="text-xs text-red-500">{errors.brandId.message as string}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t('seller.products.categories')}</Label>
                <select {...register('categoryIds')} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <option value="">{t('seller.products.selectCategory')}</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-xs text-gray-400">{t('seller.products.categoryHint')}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{t('seller.products.images')}</Label>
                <Input {...register('images')} placeholder="https://..., https://..." />
                <p className="text-xs text-gray-400">{t('seller.products.imagesHint')}</p>
              </div>

              {/* Variant (chỉ khi tạo mới) */}
              {!editProduct && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('seller.products.defaultVariant')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>SKU</Label>
                      <Input {...register('sku')} placeholder="SKU-001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('seller.products.variantPrice')}</Label>
                      <Input type="number" min={0} {...register('variantPrice')} placeholder={t('seller.products.sameAsBase')} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" {...register('isActive')} className="rounded" />
                <Label htmlFor="isActive">{t('seller.products.isActive')}</Label>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending && <Spinner size="sm" className="mr-1.5" />}
                  {editProduct ? t('common.save') : t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 font-semibold text-gray-900">{t('seller.products.confirmDelete')}</h3>
            <p className="mb-5 text-sm text-gray-500">{t('seller.products.confirmDeleteDesc', { name: deleteTarget.name })}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={() => remove.mutate(deleteTarget.id)} disabled={remove.isPending}>
                {remove.isPending && <Spinner size="sm" className="mr-1.5" />}
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
