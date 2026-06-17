import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, Smartphone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { productService } from '@/services/product.service'
import { brandService } from '@/services/brand.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { ProductListItem } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  virtualPrice: z.number().min(0),
  stock: z.number().min(0),
  brandId: z.number().min(1, 'Select a brand'),
  isActive: z.boolean(),
  images: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const LIMIT = 15

export default function AdminProductsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editProduct, setEditProduct] = useState<ProductListItem | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 400)
  const pg = useCursorPagination(LIMIT)

  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandService.list })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', debouncedSearch, pg.cursor],
    queryFn: () => productService.list({ q: debouncedSearch || undefined, limit: LIMIT, cursor: pg.cursor }),
  })

  const products = data?.data ?? []
  const hasNext = data?.hasMore ?? false

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const images = values.images?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
      const payload = {
        ...values,
        images,
        categoryIds: [] as number[],
        description: values.description || null,
      }
      return editProduct
        ? productService.update(editProduct.id, payload)
        : productService.create(payload)
    },
    onSuccess: () => {
      toast.success(editProduct ? t('common.save') + ' ✓' : t('common.create') + ' ✓')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setIsOpen(false)
      setEditProduct(null)
      reset()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      toast.success(t('common.delete') + ' ✓')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  function openCreate() {
    setEditProduct(null)
    reset({ isActive: true, basePrice: 0, virtualPrice: 0, stock: 0 })
    setIsOpen(true)
  }

  function openEdit(p: ProductListItem) {
    setEditProduct(p)
    reset({
      name: p.name,
      description: p.description ?? '',
      basePrice: p.basePrice,
      virtualPrice: p.virtualPrice,
      stock: p.totalStock,
      brandId: p.brandId,
      isActive: p.isActive,
      images: p.images.join(', '),
    })
    setIsOpen(true)
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    pg.reset()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.products')}</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>

      <div className="mb-4 relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder={t('common.search')} value={search} onChange={(e) => handleSearchChange(e.target.value)} />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : products.length === 0 ? (
          <p className="py-12 text-center text-gray-400">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.products')}</TableHead>
                <TableHead>{t('admin.brands')}</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                          <Smartphone className="h-5 w-5" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {brands?.find((b) => b.id === p.brandId)?.name ?? `#${p.brandId}`}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{formatCurrency(p.basePrice)}</TableCell>
                  <TableCell className="text-sm">{p.totalStock}</TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? 'success' : 'secondary'}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500"
                        onClick={() => { if (confirm(t('common.confirm') + '?')) deleteProduct.mutate(p.id) }}>
                        <Trash2 className="h-4 w-4" />
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
          count={products.length}
        />
      </div>

      <Dialog open={isOpen} onClose={() => { setIsOpen(false); setEditProduct(null) }}
        title={editProduct ? t('common.edit') : t('common.create')} className="max-w-xl">
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input {...register('name')} placeholder="iPhone 15 Pro Max 256GB" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Mô tả chi tiết sản phẩm..."
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sale price *</Label>
              <Input type="number" {...register('basePrice', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Listed price</Label>
              <Input type="number" {...register('virtualPrice', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Stock *</Label>
              <Input type="number" {...register('stock', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Brand *</Label>
              <Select {...register('brandId', { valueAsNumber: true })}>
                <option value="">Select brand</option>
                {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
              {errors.brandId && <p className="text-xs text-red-500">{errors.brandId.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image URLs (comma separated)</Label>
            <Input {...register('images')} placeholder="https://…jpg, https://…jpg" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" {...register('isActive')} className="h-4 w-4 rounded" />
            <Label htmlFor="isActive">Visible to customers</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              {save.isPending && <Spinner size="sm" className="mr-2" />}
              {editProduct ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
