import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sellerService } from '@/services/seller.service'
import { getErrorMessage } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLogout } from '@/hooks/useAuth'

const schema = z.object({
  activationToken: z.string().min(1, 'Vui lòng nhập token kích hoạt'),
})
type FormValues = z.infer<typeof schema>

export default function SellerVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const logout = useLogout()
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const activate = useMutation({
    mutationFn: (values: FormValues) => sellerService.activate(values.activationToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-me'] })
      setDone(true)
      // Sau activate user vẫn chưa có JWT → redirect login để đăng nhập lại
      setTimeout(() => navigate('/login'), 2000)
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              {done ? (
                <CheckCircle className="h-7 w-7 text-green-500" />
              ) : (
                <Store className="h-7 w-7 text-blue-600" />
              )}
            </div>
            {done ? (
              <>
                <h1 className="text-xl font-bold text-gray-900">{t('seller.verify.successTitle')}</h1>
                <p className="mt-1 text-sm text-gray-500">{t('seller.verify.successDesc')}</p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900">{t('seller.verify.title')}</h1>
                <p className="mt-1 text-sm text-gray-500">{t('seller.verify.desc')}</p>
              </>
            )}
          </div>

          {!done && (
            <>
              {/* Email hint */}
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-sm text-blue-700">{t('seller.verify.emailHint')}</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit((d) => activate.mutate(d))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('seller.verify.tokenLabel')}</Label>
                  <Input
                    {...register('activationToken')}
                    placeholder={t('seller.verify.tokenPlaceholder')}
                    className="font-mono text-sm"
                    autoComplete="off"
                    autoFocus
                  />
                  {errors.activationToken && (
                    <p className="text-xs text-red-500">{errors.activationToken.message}</p>
                  )}
                  {activate.isError && (
                    <p className="text-xs text-red-500">{getErrorMessage(activate.error)}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={activate.isPending}>
                  {activate.isPending && <Spinner size="sm" className="mr-2" />}
                  {t('seller.verify.submit')}
                </Button>
              </form>

              {/* Logout link */}
              <p className="mt-4 text-center text-sm text-gray-500">
                {t('seller.verify.wrongAccount')}{' '}
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {t('nav.logout')}
                </button>
              </p>
            </>
          )}

          {done && (
            <div className="mt-2 flex justify-center">
              <Spinner size="sm" className="text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
