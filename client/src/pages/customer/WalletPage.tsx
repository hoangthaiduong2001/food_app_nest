import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { walletService } from '@/services/wallet.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { Currency, WalletTransactionType } from '@/types'

const CURRENCIES: Currency[] = ['VND', 'USD', 'GBP', 'JPY', 'KRW', 'CNY']

export default function WalletPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const { data: wallet, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: walletService.get })

  const { data: txData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['wallet-transactions'],
    queryFn: ({ pageParam }) => walletService.transactions({ cursor: pageParam as number | undefined }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  })

  const setCurrency = useMutation({
    mutationFn: (currency: Currency) => walletService.setCurrency(currency),
    onSuccess: () => { toast.success(t('wallet.updateCurrency')); qc.invalidateQueries({ queryKey: ['wallet'] }) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const transactions = txData?.pages.flatMap((p) => p.data) ?? []

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('wallet.title')}</h1>

      <div className="mb-6 rounded-2xl bg-linear-to-br from-blue-700 to-slate-950 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="h-5 w-5 opacity-80" />
          <span className="text-sm opacity-80">{t('wallet.balance')}</span>
        </div>
        <div className="text-4xl font-bold mb-1">
          {formatCurrency(wallet?.balance ?? 0, wallet?.currency ?? 'VND')}
        </div>
        <div className="text-sm opacity-70">{t('wallet.account')}: {wallet?.accountNumber ?? '—'}</div>
        <div className="mt-4">
          <Select
            className="w-28 bg-white/20 border-white/30 text-white text-sm"
            value={wallet?.currency}
            onChange={(e) => setCurrency.mutate(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Button variant="outline" className="flex flex-col h-16 gap-1" onClick={() => setDepositOpen(true)}>
          <ArrowDownLeft className="h-5 w-5 text-green-500" />
          <span className="text-xs">{t('wallet.deposit')}</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-16 gap-1" onClick={() => setWithdrawOpen(true)}>
          <ArrowUpRight className="h-5 w-5 text-red-400" />
          <span className="text-xs">{t('wallet.withdraw')}</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-16 gap-1" onClick={() => setTransferOpen(true)}>
          <Send className="h-5 w-5 text-blue-500" />
          <span className="text-xs">{t('wallet.transfer')}</span>
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="p-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">{t('wallet.history')}</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="py-10 text-center text-gray-400">{t('wallet.noTransactions')}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const isIn = ['DEPOSIT', 'REFUND', 'TRANSFER_IN'].includes(tx.type)
              return (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isIn ? 'bg-green-50' : 'bg-red-50'}`}>
                      {isIn
                        ? <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        : <ArrowUpRight className="h-4 w-4 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t(`wallet.txTypes.${tx.type as WalletTransactionType}`)}</p>
                      {tx.description && <p className="text-xs text-gray-400 truncate max-w-48">{tx.description}</p>}
                      <p className="text-xs text-gray-300">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                    {isIn ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {hasNextPage && (
          <div className="p-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage && <Spinner size="sm" className="mr-2" />}
              {t('common.loadMore')}
            </Button>
          </div>
        )}
      </div>

      <DepositDialog
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => { setDepositOpen(false); qc.invalidateQueries({ queryKey: ['wallet'] }) }}
        type="DEPOSIT"
      />
      <DepositDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={() => { setWithdrawOpen(false); qc.invalidateQueries({ queryKey: ['wallet'] }) }}
        type="WITHDRAW"
      />
      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={() => { setTransferOpen(false); qc.invalidateQueries({ queryKey: ['wallet'] }) }}
      />
    </div>
  )
}

function DepositDialog({ open, onClose, onSuccess, type }: {
  open: boolean; onClose: () => void; onSuccess: () => void; type: 'DEPOSIT' | 'WITHDRAW'
}) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [currency, setCurrencyVal] = useState<Currency>('VND')
  const [note, setNote] = useState('')

  const action = useMutation({
    mutationFn: () => {
      const fn = type === 'DEPOSIT' ? walletService.createDepositRequest : walletService.createWithdrawRequest
      return fn({ currency, amount: Number(amount), note: note || undefined })
    },
    onSuccess: () => {
      toast.success(type === 'DEPOSIT' ? t('wallet.depositSuccess') : t('wallet.withdrawSuccess'))
      onSuccess()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Dialog open={open} onClose={onClose} title={type === 'DEPOSIT' ? t('wallet.deposit') : t('wallet.withdraw')}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('wallet.currency')}</Label>
          <Select value={currency} onChange={(e) => setCurrencyVal(e.target.value as Currency)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('wallet.amount')}</Label>
          <Input type="number" placeholder="100000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('wallet.note')}</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button className="w-full" onClick={() => action.mutate()} disabled={!amount || action.isPending}>
          {action.isPending && <Spinner size="sm" className="mr-2" />}
          {t('wallet.submitRequest')}
        </Button>
      </div>
    </Dialog>
  )
}

function TransferDialog({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [toAccount, setToAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [lookupName, setLookupName] = useState('')

  const lookup = useMutation({
    mutationFn: () => walletService.lookupAccount(toAccount),
    onSuccess: (data) => setLookupName((data as { name: string }).name),
    onError: () => setLookupName(''),
  })

  const transfer = useMutation({
    mutationFn: () => walletService.transfer({
      toAccountNumber: toAccount,
      amount: Number(amount),
      description: description || undefined,
    }),
    onSuccess: () => { toast.success(t('wallet.transferSuccess')); onSuccess() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Dialog open={open} onClose={onClose} title={t('wallet.transfer')}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('wallet.recipient')}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={t('wallet.recipientPlaceholder')}
              value={toAccount}
              onChange={(e) => { setToAccount(e.target.value); setLookupName('') }}
            />
            <Button variant="outline" onClick={() => lookup.mutate()} disabled={!toAccount || lookup.isPending}>
              <RefreshCw className={`h-4 w-4 ${lookup.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {lookupName && <p className="text-xs text-green-600">{t('wallet.lookupName', { name: lookupName })}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('wallet.amount')}</Label>
          <Input type="number" placeholder="50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('wallet.description')}</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button
          className="w-full"
          onClick={() => transfer.mutate()}
          disabled={!toAccount || !amount || !lookupName || transfer.isPending}
        >
          {transfer.isPending && <Spinner size="sm" className="mr-2" />}
          {t('wallet.transfer')}
        </Button>
      </div>
    </Dialog>
  )
}
