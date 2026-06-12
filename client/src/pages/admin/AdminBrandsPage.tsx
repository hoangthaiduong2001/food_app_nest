import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { brandService } from '@/services/brand.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getErrorMessage } from '@/lib/api'
import type { Brand } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  logo: z.string().url('Invalid URL').or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export default function AdminBrandsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [editBrand, setEditBrand] = useState<Brand | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: brandService.list,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      editBrand
        ? brandService.update(editBrand.id, values)
        : brandService.create({ name: values.name, logo: values.logo }),
    onSuccess: () => {
      toast.success(editBrand ? t('common.save') + ' ✓' : t('common.create') + ' ✓')
      qc.invalidateQueries({ queryKey: ['brands'] })
      setIsOpen(false)
      setEditBrand(null)
      reset()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteBrand = useMutation({
    mutationFn: (id: number) => brandService.delete(id),
    onSuccess: () => {
      toast.success(t('common.delete') + ' ✓')
      qc.invalidateQueries({ queryKey: ['brands'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  function openCreate() { setEditBrand(null); reset({}); setIsOpen(true) }
  function openEdit(b: Brand) { setEditBrand(b); reset({ name: b.name, logo: b.logo }); setIsOpen(true) }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.brands')}</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !brands?.length ? (
          <p className="py-12 text-center text-gray-400">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>{t('adminUsers.name')}</TableHead>
                <TableHead>ID</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="h-10 w-10 rounded-lg object-contain bg-gray-50" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-sm text-gray-400">{brand.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(brand)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500"
                        onClick={() => { if (confirm(t('common.confirm') + '?')) deleteBrand.mutate(brand.id) }}>
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
        onClose={() => { setIsOpen(false); setEditBrand(null) }}
        title={editBrand ? t('common.edit') : t('common.create')}
      >
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('adminUsers.name')} *</Label>
            <Input {...register('name')} placeholder="Apple" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Logo URL *</Label>
            <Input {...register('logo')} placeholder="https://…" />
            {errors.logo && <p className="text-xs text-red-500">{errors.logo.message}</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={save.isPending}>
              {save.isPending && <Spinner size="sm" className="mr-2" />}
              {editBrand ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
