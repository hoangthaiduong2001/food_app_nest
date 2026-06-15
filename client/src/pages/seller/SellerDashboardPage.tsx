import { useQuery } from '@tanstack/react-query'
import { sellerService } from '@/services/seller.service'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Store, Clock, CheckCircle, XCircle, AlertTriangle, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SellerStatus } from '@/types'

const STATUS_CONFIG: Record<SellerStatus, {
  icon: typeof Clock
  color: string
  variant: 'warning' | 'success' | 'destructive' | 'secondary'
}> = {
  PENDING:   { icon: Clock,         color: 'text-yellow-600', variant: 'warning' },
  APPROVED:  { icon: Mail,          color: 'text-blue-600',   variant: 'secondary' },
  ACTIVE:    { icon: CheckCircle,   color: 'text-green-600',  variant: 'success' },
  REJECTED:  { icon: XCircle,       color: 'text-red-600',    variant: 'destructive' },
  SUSPENDED: { icon: AlertTriangle, color: 'text-orange-600', variant: 'secondary' },
}

export default function SellerDashboardPage() {
  const { t } = useTranslation()
  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller-me'],
    queryFn: sellerService.getMe,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!seller) return null

  const status = seller.status as SellerStatus
  const { icon: StatusIcon, color, variant } = STATUS_CONFIG[status]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('seller.dashboard')}</h1>

      {/* Shop info card */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          {seller.logo ? (
            <img src={seller.logo} alt={seller.shopName} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-100">
              <Store className="h-8 w-8 text-green-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{seller.shopName}</h2>
              <Badge variant={variant}>
                <StatusIcon className={`mr-1 h-3 w-3 ${color}`} />
                {t(`seller.status.${status}`)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mb-1">@{seller.shopSlug}</p>
            {seller.description && (
              <p className="text-sm text-gray-600">{seller.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status banners */}
      {status === 'PENDING' && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 mb-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">{t('seller.pendingTitle')}</p>
              <p className="text-sm text-yellow-700 mt-0.5">{t('seller.pendingDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'APPROVED' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">{t('seller.approvedTitle')}</p>
              <p className="text-sm text-blue-700 mt-0.5">{t('seller.approvedDesc', { email: seller.email })}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'REJECTED' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">{t('seller.rejectedTitle')}</p>
              <p className="text-sm text-red-700 mt-0.5">{t('seller.rejectedDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'SUSPENDED' && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
            <div>
              <p className="font-medium text-orange-800">{t('seller.suspendedTitle')}</p>
              <p className="text-sm text-orange-700 mt-0.5">{t('seller.suspendedDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Shop details */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={t('seller.email')} value={seller.email} />
        <InfoCard label={t('seller.phone')} value={seller.phone} />
        <InfoCard label={t('seller.address')} value={seller.address} />
        <InfoCard label={t('seller.commissionRate')} value={`${seller.commissionRate}%`} />
        <InfoCard
          label={t('seller.approvedAt')}
          value={seller.approvedAt ? new Date(seller.approvedAt).toLocaleDateString('vi-VN') : '—'}
        />
        {seller.activatedAt && (
          <InfoCard
            label={t('seller.activatedAt')}
            value={new Date(seller.activatedAt).toLocaleDateString('vi-VN')}
          />
        )}
        <InfoCard
          label={t('seller.memberSince')}
          value={new Date(seller.createdAt).toLocaleDateString('vi-VN')}
        />
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  )
}
