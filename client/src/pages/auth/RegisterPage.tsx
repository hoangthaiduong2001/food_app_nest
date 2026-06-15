import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Smartphone, User, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRegister, useRegisterSeller } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AccountType = 'user' | 'seller'

const baseSchema = z.object({
  name: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phoneNumber: z.string().min(10, 'Số điện thoại không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string(),
})

const userSchema = baseSchema.refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

const sellerSchema = baseSchema.extend({
  shopName: z.string().min(2, 'Tên shop tối thiểu 2 ký tự'),
  shopSlug: z
    .string()
    .min(2, 'Slug tối thiểu 2 ký tự')
    .regex(/^[a-z0-9-]+$/, 'Chỉ dùng chữ thường, số và dấu gạch ngang'),
  shopEmail: z.string().email('Email shop không hợp lệ'),
  shopPhone: z.string().min(8, 'Số điện thoại shop không hợp lệ'),
  shopAddress: z.string().min(5, 'Địa chỉ shop tối thiểu 5 ký tự'),
  shopDescription: z.string().max(2000).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

type UserFormValues = z.infer<typeof userSchema>
type SellerFormValues = z.infer<typeof sellerSchema>

export default function RegisterPage() {
  const { t } = useTranslation()
  const [accountType, setAccountType] = useState<AccountType>('user')
  const register_ = useRegister()
  const registerSeller = useRegisterSeller()

  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  })

  const sellerForm = useForm<SellerFormValues>({
    resolver: zodResolver(sellerSchema),
  })

  const isLoading = register_.isPending || registerSeller.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{t('auth.register')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Account type selector */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setAccountType('user')}
              className={[
                'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                accountType === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              <User className="h-4 w-4" />
              {t('auth.accountTypeUser')}
            </button>
            <button
              type="button"
              onClick={() => setAccountType('seller')}
              className={[
                'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                accountType === 'seller'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              <Store className="h-4 w-4" />
              {t('auth.accountTypeSeller')}
            </button>
          </div>

          {accountType === 'user' ? (
            <form
              onSubmit={userForm.handleSubmit((d) => register_.mutate(d))}
              className="space-y-4"
            >
              <UserFields form={userForm} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('common.loading') : t('auth.register')}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={sellerForm.handleSubmit((d) => registerSeller.mutate(d))}
              className="space-y-4"
            >
              <UserFields form={sellerForm} />

              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-gray-700">{t('auth.shopInfo')}</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t('seller.shopName')} *</Label>
                      <Input {...sellerForm.register('shopName')} placeholder="My Shop" />
                      {sellerForm.formState.errors.shopName && (
                        <p className="text-xs text-red-500">{sellerForm.formState.errors.shopName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('seller.shopSlug')} *</Label>
                      <Input {...sellerForm.register('shopSlug')} placeholder="my-shop" />
                      {sellerForm.formState.errors.shopSlug && (
                        <p className="text-xs text-red-500">{sellerForm.formState.errors.shopSlug.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t('seller.shopEmail')} *</Label>
                      <Input type="email" {...sellerForm.register('shopEmail')} />
                      {sellerForm.formState.errors.shopEmail && (
                        <p className="text-xs text-red-500">{sellerForm.formState.errors.shopEmail.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('seller.shopPhone')} *</Label>
                      <Input {...sellerForm.register('shopPhone')} />
                      {sellerForm.formState.errors.shopPhone && (
                        <p className="text-xs text-red-500">{sellerForm.formState.errors.shopPhone.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('seller.shopAddress')} *</Label>
                    <Input {...sellerForm.register('shopAddress')} />
                    {sellerForm.formState.errors.shopAddress && (
                      <p className="text-xs text-red-500">{sellerForm.formState.errors.shopAddress.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('seller.shopDescription')}</Label>
                    <Input {...sellerForm.register('shopDescription')} placeholder={t('seller.shopDescriptionPlaceholder')} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                {isLoading ? t('common.loading') : t('auth.registerAsSeller')}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Shared user fields component — uses unknown-keyed register to work with both form schemas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UserFields({ form }: { form: any }) {
  const { t } = useTranslation()
  const f = form
  return (
    <>
      <div className="space-y-1.5">
        <Label>{t('auth.name')} *</Label>
        <Input {...f.register('name')} />
        {f.formState.errors.name && (
          <p className="text-xs text-red-500">{f.formState.errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>{t('auth.email')} *</Label>
        <Input type="email" {...f.register('email')} />
        {f.formState.errors.email && (
          <p className="text-xs text-red-500">{f.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>{t('auth.phone')} *</Label>
        <Input {...f.register('phoneNumber')} />
        {f.formState.errors.phoneNumber && (
          <p className="text-xs text-red-500">{f.formState.errors.phoneNumber.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('auth.password')} *</Label>
          <Input type="password" placeholder="••••••••" {...f.register('password')} />
          {f.formState.errors.password && (
            <p className="text-xs text-red-500">{f.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t('auth.confirmPassword')} *</Label>
          <Input type="password" placeholder="••••••••" {...f.register('confirmPassword')} />
          {f.formState.errors.confirmPassword && (
            <p className="text-xs text-red-500">{f.formState.errors.confirmPassword.message}</p>
          )}
        </div>
      </div>
    </>
  )
}
