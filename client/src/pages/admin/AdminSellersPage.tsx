import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { TablePagination } from '@/components/ui/table-pagination';
import { useCursorPagination } from '@/hooks/useCursorPagination';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { adminSellerService } from '@/services/admin-seller.service';
import type { SellerProfile, SellerStatus } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  ChevronRight,
  Clock,
  PauseCircle,
  Store,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

type Tab = SellerStatus | 'ALL';

const TABS: Tab[] = [
  'ALL',
  'PENDING',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
];

const BADGE_CONFIG: Record<
  SellerStatus,
  {
    variant: 'warning' | 'success' | 'destructive' | 'secondary';
    icon: typeof Clock;
  }
> = {
  PENDING: { variant: 'warning', icon: Clock },
  APPROVED: { variant: 'secondary', icon: CheckCircle },
  ACTIVE: { variant: 'success', icon: CheckCircle },
  REJECTED: { variant: 'destructive', icon: XCircle },
  SUSPENDED: { variant: 'secondary', icon: PauseCircle },
};

type ApproveForm = { commissionRate: string };

const rejectSchema = z.object({
  reason: z.string().min(5, 'Tối thiểu 5 ký tự'),
});
type RejectForm = z.infer<typeof rejectSchema>;

const LIMIT = 15;

export default function AdminSellersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [selected, setSelected] = useState<SellerProfile | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const pg = useCursorPagination(LIMIT);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sellers', activeTab, pg.cursor],
    queryFn: () =>
      adminSellerService.list({
        status: activeTab === 'ALL' ? undefined : activeTab,
        cursor: pg.cursor,
        limit: LIMIT,
      }),
  });

  const rows = data?.data ?? [];
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['admin-sellers'] });

  const approve = useMutation({
    mutationFn: ({
      id,
      commissionRate,
    }: {
      id: number;
      commissionRate: number;
    }) => adminSellerService.approve(id, commissionRate),
    onSuccess: () => {
      toast.success(t('adminSellers.approveSuccess'));
      setApproveOpen(false);
      setSelected(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminSellerService.reject(id, reason),
    onSuccess: () => {
      toast.success(t('adminSellers.rejectSuccess'));
      setRejectOpen(false);
      setSelected(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const suspend = useMutation({
    mutationFn: (id: number) => adminSellerService.suspend(id),
    onSuccess: () => {
      toast.success(t('adminSellers.suspendSuccess'));
      setSelected(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approveForm = useForm<ApproveForm>({
    defaultValues: { commissionRate: '10' },
  });

  const rejectForm = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
  });

  function openApprove(seller: SellerProfile) {
    setSelected(seller);
    approveForm.reset({ commissionRate: String(seller.commissionRate ?? 10) });
    setApproveOpen(true);
  }

  function openReject(seller: SellerProfile) {
    setSelected(seller);
    rejectForm.reset();
    setRejectOpen(true);
  }

  const TAB_STYLES: Record<Tab, string> = {
    ALL: 'text-blue-600 border-blue-500',
    PENDING: 'text-yellow-600 border-yellow-500',
    APPROVED: 'text-gray-600 border-gray-500',
    ACTIVE: 'text-green-600 border-green-500',
    REJECTED: 'text-red-500 border-red-400',
    SUSPENDED: 'text-orange-500 border-orange-400',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t('adminSellers.title')}
      </h1>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto overflow-y-hidden">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                pg.reset();
              }}
              className={[
                'whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? TAB_STYLES[tab]
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {t(`adminSellers.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">{t('adminSellers.shop')}</th>
              <th className="px-4 py-3">{t('adminSellers.contact')}</th>
              <th className="px-4 py-3">{t('adminSellers.commission')}</th>
              <th className="px-4 py-3">{t('adminSellers.registeredAt')}</th>
              <th className="px-4 py-3">{t('common.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Spinner size="lg" className="mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              rows.map((seller) => {
                const status = seller.status as SellerStatus;
                const { variant, icon: Icon } = BADGE_CONFIG[status];
                return (
                  <tr
                    key={seller.id}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {seller.logo ? (
                          <img
                            src={seller.logo}
                            alt={seller.shopName}
                            className="h-8 w-8 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 shrink-0">
                            <Store className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-40">
                            {seller.shopName}
                          </p>
                          <p className="text-xs text-gray-400">
                            @{seller.shopSlug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{seller.email}</p>
                      <p className="text-xs text-gray-400">{seller.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {seller.commissionRate}%
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(seller.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {t(`adminSellers.status.${status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => openApprove(seller)}
                            >
                              {t('adminSellers.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => openReject(seller)}
                            >
                              {t('adminSellers.reject')}
                            </Button>
                          </>
                        )}
                        {status === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => suspend.mutate(seller.id)}
                            disabled={suspend.isPending}
                          >
                            {t('adminSellers.suspend')}
                          </Button>
                        )}
                        <button
                          onClick={() =>
                            setSelected(
                              selected?.id === seller.id ? null : seller,
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title={t('adminSellers.detail')}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <TablePagination
          page={pg.page}
          hasPrev={pg.hasPrev}
          hasNext={data?.hasMore ?? false}
          onPrev={pg.prevPage}
          onNext={() =>
            data?.nextCursor != null && pg.nextPage(data.nextCursor)
          }
          count={rows.length}
        />
      </div>

      {/* Detail panel */}
      {selected && !approveOpen && !rejectOpen && (
        <SellerDetailPanel
          seller={selected}
          onClose={() => setSelected(null)}
          onApprove={() => openApprove(selected)}
          onReject={() => openReject(selected)}
          onSuspend={() => suspend.mutate(selected.id)}
          suspending={suspend.isPending}
          t={t}
        />
      )}

      {/* Approve modal */}
      {approveOpen && selected && (
        <Modal
          title={t('adminSellers.approveTitle')}
          onClose={() => setApproveOpen(false)}
        >
          <p className="mb-4 text-sm text-gray-600">
            {t('adminSellers.approveDesc', { shop: selected.shopName })}
          </p>
          <form
            onSubmit={approveForm.handleSubmit((d) => {
              const rate = parseFloat(d.commissionRate);
              if (isNaN(rate) || rate < 0 || rate > 100) return;
              approve.mutate({ id: selected.id, commissionRate: rate });
            })}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>{t('adminSellers.commissionRate')} (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                {...approveForm.register('commissionRate')}
              />
              {approveForm.formState.errors.commissionRate && (
                <p className="text-xs text-red-500">
                  {approveForm.formState.errors.commissionRate.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setApproveOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={approve.isPending}
              >
                {approve.isPending && <Spinner size="sm" className="mr-1.5" />}
                {t('adminSellers.approve')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectOpen && selected && (
        <Modal
          title={t('adminSellers.rejectTitle')}
          onClose={() => setRejectOpen(false)}
        >
          <p className="mb-4 text-sm text-gray-600">
            {t('adminSellers.rejectDesc', { shop: selected.shopName })}
          </p>
          <form
            onSubmit={rejectForm.handleSubmit((d) =>
              reject.mutate({ id: selected.id, reason: d.reason }),
            )}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>{t('adminSellers.rejectReason')}</Label>
              <Input
                {...rejectForm.register('reason')}
                placeholder={t('adminSellers.rejectReasonPlaceholder')}
              />
              {rejectForm.formState.errors.reason && (
                <p className="text-xs text-red-500">
                  {rejectForm.formState.errors.reason.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={reject.isPending}
              >
                {reject.isPending && <Spinner size="sm" className="mr-1.5" />}
                {t('adminSellers.reject')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function SellerDetailPanel({
  seller,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  suspending,
  t,
}: {
  seller: SellerProfile;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  suspending: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const status = seller.status as SellerStatus;
  const { variant, icon: Icon } = BADGE_CONFIG[status];

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          {seller.logo ? (
            <img
              src={seller.logo}
              alt={seller.shopName}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Store className="h-6 w-6 text-green-600" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {seller.shopName}
            </h2>
            <p className="text-sm text-gray-400">@{seller.shopSlug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {t(`adminSellers.status.${status}`)}
          </Badge>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {seller.description && (
        <p className="mb-4 text-sm text-gray-600">{seller.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-5">
        <InfoItem label={t('adminSellers.email')} value={seller.email} />
        <InfoItem label={t('adminSellers.phone')} value={seller.phone} />
        <InfoItem label={t('adminSellers.address')} value={seller.address} />
        <InfoItem
          label={t('adminSellers.commissionRate')}
          value={`${seller.commissionRate}%`}
        />
        <InfoItem
          label={t('adminSellers.registeredAt')}
          value={formatDate(seller.createdAt)}
        />
        {seller.approvedAt && (
          <InfoItem
            label={t('adminSellers.approvedAt')}
            value={formatDate(seller.approvedAt)}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-gray-100 pt-4">
        {status === 'PENDING' && (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={onApprove}
            >
              {t('adminSellers.approve')}
            </Button>
            <Button size="sm" variant="destructive" onClick={onReject}>
              {t('adminSellers.reject')}
            </Button>
          </>
        )}
        {status === 'APPROVED' && (
          <Button
            size="sm"
            variant="outline"
            className="text-orange-600 border-orange-300"
            onClick={onSuspend}
            disabled={suspending}
          >
            {suspending && <Spinner size="sm" className="mr-1.5" />}
            {t('adminSellers.suspend')}
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-800 wrap-break-word">{value}</p>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
