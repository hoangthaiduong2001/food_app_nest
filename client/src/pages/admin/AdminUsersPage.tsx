import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { userService } from '@/services/user.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { AdminUser } from '@/types'

const createSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name is required'),
  password: z.string().min(6, 'Min 6 characters'),
  phoneNumber: z.string().min(10, 'Invalid phone number'),
  roleId: z.number().int().positive(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
})

const editSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNumber: z.string().min(10).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  roleId: z.number().int().positive().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

type StatusVariant = 'success' | 'warning' | 'destructive'
const STATUS_VARIANT: Record<string, StatusVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  BLOCKED: 'destructive',
}

const ROLES = [
  { id: 1, name: 'ADMIN' },
  { id: 2, name: 'CLIENT' },
]

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => userService.list({ page, limit: 10, search: search || undefined }),
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { status: 'ACTIVE', roleId: 2 },
  })

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const createUser = useMutation({
    mutationFn: (values: CreateForm) => userService.create(values),
    onSuccess: () => {
      toast.success(t('adminUsers.createSuccess'))
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateUser = useMutation({
    mutationFn: (values: EditForm) => userService.update(editTarget!.id, values),
    onSuccess: () => {
      toast.success(t('adminUsers.updateSuccess'))
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setEditTarget(null)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      toast.success(t('adminUsers.deleteSuccess'))
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  function openEdit(user: AdminUser) {
    setEditTarget(user)
    editForm.reset({
      name: user.name,
      phoneNumber: user.phoneNumber,
      status: user.status,
      roleId: user.roleId,
      avatar: user.avatar ?? '',
    })
  }

  const users = data?.data ?? []
  const meta = data?.meta

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminUsers.title')}</h1>
          {meta && (
            <p className="text-sm text-gray-400 mt-0.5">
              {t('adminUsers.totalUsers', { count: meta.total })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 w-56"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Button onClick={() => { createForm.reset({ status: 'ACTIVE', roleId: 2 }); setCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('adminUsers.addUser')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-gray-400">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('adminUsers.name')}</TableHead>
                <TableHead>{t('adminUsers.email')}</TableHead>
                <TableHead>{t('adminUsers.phone')}</TableHead>
                <TableHead>{t('adminUsers.role')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-sm text-gray-400">#{user.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {user.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-sm">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                  <TableCell className="text-sm text-gray-500">{user.phoneNumber}</TableCell>
                  <TableCell>
                    <Badge variant={user.role.name === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                      {user.role.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[user.status]} className="text-xs">
                      {t(`adminUsers.statusValues.${user.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-500"
                        onClick={() => { if (confirm(t('adminUsers.confirmDelete'))) deleteUser.mutate(user.id) }}
                        disabled={deleteUser.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-400">
              {t('adminUsers.totalUsers', { count: meta.total })} — {t('common.all')} {meta.totalPages} {t('common.status', 'pages')}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>
                «
              </Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                ‹
              </Button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 px-0"
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                ›
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(meta.totalPages)}>
                »
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('adminUsers.createUser')}>
        <form
          onSubmit={createForm.handleSubmit((d) => createUser.mutate(d))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('adminUsers.name')} *</Label>
              <Input {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-red-500">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminUsers.phone')} *</Label>
              <Input {...createForm.register('phoneNumber')} />
              {createForm.formState.errors.phoneNumber && (
                <p className="text-xs text-red-500">{createForm.formState.errors.phoneNumber.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('adminUsers.email')} *</Label>
            <Input type="email" {...createForm.register('email')} />
            {createForm.formState.errors.email && (
              <p className="text-xs text-red-500">{createForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t('adminUsers.password')} *</Label>
            <Input type="password" {...createForm.register('password')} />
            {createForm.formState.errors.password && (
              <p className="text-xs text-red-500">{createForm.formState.errors.password.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('adminUsers.role')}</Label>
              <Select {...createForm.register('roleId', { valueAsNumber: true })}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminUsers.status')}</Label>
              <Select {...createForm.register('status')}>
                {(['ACTIVE', 'INACTIVE', 'BLOCKED'] as const).map((s) => (
                  <option key={s} value={s}>{t(`adminUsers.statusValues.${s}`)}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={createUser.isPending}>
              {createUser.isPending && <Spinner size="sm" className="mr-2" />}
              {t('adminUsers.createUser')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={t('adminUsers.editUser')}
      >
        <form
          onSubmit={editForm.handleSubmit((d) => updateUser.mutate(d))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('adminUsers.name')}</Label>
              <Input {...editForm.register('name')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminUsers.phone')}</Label>
              <Input {...editForm.register('phoneNumber')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('adminUsers.avatar')}</Label>
            <Input {...editForm.register('avatar')} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('adminUsers.role')}</Label>
              <Select {...editForm.register('roleId', { valueAsNumber: true })}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminUsers.status')}</Label>
              <Select {...editForm.register('status')}>
                {(['ACTIVE', 'INACTIVE', 'BLOCKED'] as const).map((s) => (
                  <option key={s} value={s}>{t(`adminUsers.statusValues.${s}`)}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={updateUser.isPending}>
              {updateUser.isPending && <Spinner size="sm" className="mr-2" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
