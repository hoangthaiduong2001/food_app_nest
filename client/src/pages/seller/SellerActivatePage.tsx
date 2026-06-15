import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { sellerService } from '@/services/seller.service'
import { getErrorMessage } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SellerActivatePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activate = useMutation({
    mutationFn: () => sellerService.activate(token),
    onError: (e) => setErrorMsg(getErrorMessage(e)),
  })

  useEffect(() => {
    if (token) activate.mutate()
    else setErrorMsg(t('seller.activate.noToken'))
    // chỉ chạy 1 lần khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <Store className="h-7 w-7 text-green-600" />
        </div>

        {/* Loading */}
        {activate.isPending && (
          <>
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="font-semibold text-gray-800">{t('seller.activate.verifying')}</p>
            <p className="mt-1 text-sm text-gray-500">{t('seller.activate.wait')}</p>
          </>
        )}

        {/* Success */}
        {activate.isSuccess && (
          <>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('seller.activate.successTitle')}</h1>
            <p className="text-sm text-gray-500 mb-6">{t('seller.activate.successDesc', { shop: activate.data.shopName })}</p>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              {t('seller.activate.goLogin')}
            </Link>
          </>
        )}

        {/* Error */}
        {(activate.isError || errorMsg) && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('seller.activate.errorTitle')}</h1>
            <p className="text-sm text-red-600 mb-6">{errorMsg}</p>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('seller.activate.goLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
