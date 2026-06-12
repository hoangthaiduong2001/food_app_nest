import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { walletService } from '@/services/wallet.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { DepositRequestStatus, Currency } from '@/types'

const rejectSchema = z.object({
  rejectReason: z.string().min(3, 'Reason is too short'),
})
type RejectForm = z.infer<typeof rejectSchema>

const rateSchema = z.object({
  fromCurrency: z.enum(['VND', 'USD', 'GBP', 'JPY', 'KRW', 'CNY']),
  toCurrency: z.enum(['VND', 'USD', 'GBP', 'JPY', 'KRW', 'CNY']),
  rate: z.number().positive(),
})
type RateForm = z.infer<typeof rateSchema>

const CURRENCIES: Currency[] = ['VND', 'USD', 'GBP', 'JPY', 'KRW', 'CNY']

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'

const STATUS_VARIANTS: Record<DepositRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
}

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

const TABS: Tab[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

const LIMIT = 15

export default function AdminWalletPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('PENDING')
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const pg = useCursorPagination(LIMIT)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deposit-requests', activeTab, pg.cursor],
    queryFn: () => walletService.adminListRequests({ status: activeTab, cursor: pg.cursor, limit: LIMIT }),
  })

  const approve = useMutation({
    mutationFn: (id: number) => walletService.adminApprove(id),
    onSuccess: () => {
      toast.success(t('adminWallet.approveSuccess'))
      qc.invalidateQueries({ queryKey: ['admin-deposit-requests'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      walletService.adminReject(id, reason),
    onSuccess: () => {
      toast.success(t('adminWallet.rejectSuccess'))
      qc.invalidateQueries({ queryKey: ['admin-deposit-requests'] })
      setRejectTarget(null)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const { register: registerReject, handleSubmit: handleRejectSubmit, reset: resetReject } = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
  })

  const { register: registerRate, handleSubmit: handleRateSubmit, formState: { errors: rateErrors } } = useForm<RateForm>({
    resolver: zodResolver(rateSchema),
  })

  const setRate = useMutation({
    mutationFn: (values: RateForm) => walletService.adminSetExchangeRate(values),
    onSuccess: () => {
      toast.success(t('adminWallet.rateSuccess'))
      setRateOpen(false)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const requests = data?.data ?? []
  const hasNext = data?.hasMore ?? false

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    pg.reset()
  }

  const TAB_STYLES: Record<Tab, string> = {
    PENDING: 'text-yellow-600 border-yellow-500 bg-yellow-50',
    APPROVED: 'text-green-600 border-green-500 bg-green-50',
    REJECTED: 'text-red-600 border-red-500 bg-red-50',
    CANCELLED: 'text-gray-500 border-gray-400 bg-gray-50',
  }

  const TAB_INACTIVE = 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('adminWallet.title')}</h1>
        <Button variant="outline" onClick={() => setRateOpen(true)}>
          {t('adminWallet.updateRate')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-0 border-b border-gray-200">
        <nav className="flex gap-1 px-2" aria-label="Tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={[
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive ? TAB_STYLES[tab] : TAB_INACTIVE,
                ].join(' ')}
              >
                {t(`adminWallet.statusValues.${tab}`)}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Table */}
      <div className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : requests.length === 0 ? (
          <p className="py-12 text-center text-gray-400">{t('common.noData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('adminWallet.type')}</TableHead>
                <TableHead>{t('adminWallet.userId')}</TableHead>
                <TableHead>{t('adminWallet.amount')}</TableHead>
                <TableHead>{t('adminWallet.currency')}</TableHead>
                <TableHead>{t('adminWallet.requestDate')}</TableHead>
                {activeTab === 'PENDING' && (
                  <TableHead>{t('adminWallet.operations')}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="text-sm text-gray-400">#{req.id}</TableCell>
                  <TableCell>
                    <Badge variant={req.type === 'DEPOSIT' ? 'success' : 'destructive'} className="text-xs">
                      {req.type === 'DEPOSIT' ? t('adminWallet.depositType') : t('adminWallet.withdrawType')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{req.userId}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(req.amount, req.currency)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{req.currency}</TableCell>
                  <TableCell className="text-sm text-gray-400">{formatDate(req.createdAt)}</TableCell>
                  {activeTab === 'PENDING' && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50"
                          onClick={() => approve.mutate(req.id)} disabled={approve.isPending}
                          title={t('adminWallet.approveSuccess')}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                          onClick={() => { setRejectTarget(req.id); resetReject() }}
                          title={t('adminWallet.rejectTitle')}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
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
          count={requests.length}
        />
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectTarget !== null} onClose={() => setRejectTarget(null)} title={t('adminWallet.rejectTitle')}>
        <form
          onSubmit={handleRejectSubmit((d) => reject.mutate({ id: rejectTarget!, reason: d.rejectReason }))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>{t('adminWallet.rejectReason')} *</Label>
            <Input {...registerReject('rejectReason')} placeholder={t('adminWallet.rejectReasonPlaceholder')} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={reject.isPending}>
              {reject.isPending && <Spinner size="sm" className="mr-2" />}
              {t('adminWallet.rejectTitle')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Exchange rate dialog */}
      <Dialog open={rateOpen} onClose={() => setRateOpen(false)} title={t('adminWallet.rateTitle')}>
        <form onSubmit={handleRateSubmit((d) => setRate.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('adminWallet.from')}</Label>
              <Select {...registerRate('fromCurrency')}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('adminWallet.to')}</Label>
              <Select {...registerRate('toCurrency')}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('adminWallet.rate')} *</Label>
            <Input
              type="number"
              step="0.0001"
              {...registerRate('rate', { valueAsNumber: true })}
              placeholder="25000"
            />
            {rateErrors.rate && <p className="text-xs text-red-500">{rateErrors.rate.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setRateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={setRate.isPending}>
              {setRate.isPending && <Spinner size="sm" className="mr-2" />}
              {t('adminWallet.saveRate')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
