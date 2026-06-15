import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { cartService } from '@/services/cart.service'
import { orderService } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { PaymentMethod } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Invalid phone number'),
  address: z.string().min(5, 'Address is required'),
  paymentMethod: z.enum(['COD', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD']),
})

type FormValues = z.infer<typeof schema>

export default function CheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: cart, isLoading } = useQuery({ queryKey: ['cart'], queryFn: cartService.get })

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'E_WALLET' },
  })

  // Đọc variantIds đã chọn từ CartPage
  const selectedVariantIds: number[] = JSON.parse(
    sessionStorage.getItem('checkout_variantIds') ?? 'null',
  ) ?? cart?.items.map((i) => i.variantId) ?? []

  const checkout = useMutation({
    mutationFn: (values: FormValues) =>
      orderService.checkout({
        variantIds: selectedVariantIds,
        receiver: { name: values.name, phone: values.phone, address: values.address },
        paymentMethod: values.paymentMethod as PaymentMethod,
      }),
    onSuccess: (order) => {
      sessionStorage.removeItem('checkout_variantIds')
      toast.success(t('checkout.orderSuccess'))
      navigate(`/orders/${order.id}`)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    COD: t('checkout.cod', 'Cash on Delivery (COD)'),
    BANK_TRANSFER: t('checkout.bankTransfer', 'Bank Transfer'),
    E_WALLET: t('checkout.eWallet', 'TechStore Wallet'),
    CREDIT_CARD: t('checkout.creditCard', 'Credit Card (Stripe)'),
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const allItems = cart?.items ?? []
  const items = selectedVariantIds.length
    ? allItems.filter((i) => selectedVariantIds.includes(i.variantId))
    : allItems
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('checkout.title')}</h1>
      <form onSubmit={handleSubmit((d) => checkout.mutate(d))}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">{t('checkout.recipientInfo')}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('auth.name')} *</Label>
                  <Input {...register('name')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('auth.phone')} *</Label>
                  <Input {...register('phone')} />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('orders.shippingAddress')} *</Label>
                  <Input {...register('address')} />
                  {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">{t('checkout.paymentMethod')}</h2>
              <Select {...register('paymentMethod')}>
                {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm h-fit sticky top-20">
            <h2 className="mb-4 font-semibold text-gray-900">{t('checkout.orderSummary')}</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-32">{item.productName} × {item.quantity}</span>
                  <span>{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('cart.shippingFee')}</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>{t('cart.total')}</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button type="submit" className="mt-4 w-full" size="lg" disabled={checkout.isPending}>
              {checkout.isPending && <Spinner size="sm" className="mr-2" />}
              {t('checkout.placeOrder')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
