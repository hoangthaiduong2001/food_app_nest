import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { categoryService } from '@/services/category.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/api'
import type { Category } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  logo: z.string().optional(),
  parentCategoryId: z.number().optional(),
})

type FormValues = z.infer<typeof schema>

export default function AdminCategoriesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.list(),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        logo: values.logo || undefined,
        parentCategoryId: values.parentCategoryId || undefined,
      }
      return editCategory
        ? categoryService.update(editCategory.id, payload)
        : categoryService.create(payload)
    },
    onSuccess: () => {
      toast.success(editCategory ? t('common.save') + ' ✓' : t('common.create') + ' ✓')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setIsOpen(false)
      setEditCategory(null)
      reset()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteCategory = useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: () => {
      toast.success(t('common.delete') + ' ✓')
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  function openCreate() {
    setEditCategory(null)
    reset({})
    setIsOpen(true)
  }

  function openEdit(c: Category) {
    setEditCategory(c)
    reset({ name: c.name, logo: c.logo, parentCategoryId: c.parentCategoryId })
    setIsOpen(true)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.categories')}</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !categories?.length ? (
          <p className="py-12 text-center text-gray-400">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('adminUsers.name')}</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-gray-400 text-sm">{cat.id}</TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    {cat.logo ? (
                      <img src={cat.logo} alt={cat.name} className="h-8 w-8 rounded object-cover" />
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {cat.parentCategoryId
                      ? categories.find((c) => c.id === cat.parentCategoryId)?.name ?? `#${cat.parentCategoryId}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500"
                        onClick={() => { if (confirm(t('common.confirm') + '?')) deleteCategory.mutate(cat.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={isOpen}
        onClose={() => { setIsOpen(false); setEditCategory(null) }}
        title={editCategory ? t('common.edit') : t('common.create')}
      >
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('adminUsers.name')} *</Label>
            <Input {...register('name')} placeholder="Điện thoại" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input {...register('logo')} placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label>Parent category (optional)</Label>
            <Select {...register('parentCategoryId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}>
              <option value="">None</option>
              {categories?.filter((c) => c.id !== editCategory?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              {save.isPending && <Spinner size="sm" className="mr-2" />}
              {editCategory ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
