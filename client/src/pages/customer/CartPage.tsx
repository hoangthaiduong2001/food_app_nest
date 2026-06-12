import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2, Minus, Plus, ShoppingCart, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { cartService } from '@/services/cart.service'
import { useCartStore } from '@/stores/cart.store'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'

export default function CartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setCart = useCartStore((s) => s.setCart)

  const { data: cart, isLoading } = useQuery({ queryKey: ['cart'], queryFn: cartService.get })

  // Selected variantIds — default chọn tất cả khi cart load
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (cart) {
      setCart(cart)
      setSelected(new Set(cart.items.map((i) => i.variantId)))
    }
  }, [cart, setCart])

  const update = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: number; quantity: number }) =>
      cartService.updateItem(variantId, quantity),
    onSuccess: (updated) => { setCart(updated); qc.invalidateQueries({ queryKey: ['cart'] }) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (variantId: number) => cartService.removeItem(variantId),
    onSuccess: (updated, variantId) => {
      setCart(updated)
      setSelected((prev) => { const next = new Set(prev); next.delete(variantId); return next })
      qc.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const items = cart?.items ?? []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ShoppingCart className="h-16 w-16 text-gray-200" />
        <h2 className="text-xl font-semibold text-gray-500">{t('cart.empty')}</h2>
        <Button onClick={() => navigate('/products')}>{t('nav.products')}</Button>
      </div>
    )
  }

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.variantId))
  const someChecked = items.some((i) => selected.has(i.variantId))

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map((i) => i.variantId)))
    }
  }

  function toggleItem(variantId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(variantId)) next.delete(variantId)
      else next.add(variantId)
      return next
    })
  }

  const selectedItems = items.filter((i) => selected.has(i.variantId))
  const subtotal = selectedItems.reduce((s, i) => s + i.lineTotal, 0)

  function handleCheckout() {
    if (selected.size === 0) {
      toast.error(t('cart.selectAtLeastOne'))
      return
    }
    // Lưu selected variantIds để CheckoutPage đọc
    sessionStorage.setItem('checkout_variantIds', JSON.stringify([...selected]))
    navigate('/checkout')
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {t('cart.title')} ({items.length})
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {/* Select all */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">{t('cart.selectAll')}</span>
            <span className="ml-auto text-xs text-gray-400">
              {selected.size}/{items.length} {t('cart.itemsSelected')}
            </span>
          </label>

          {/* Items */}
          {items.map((item) => (
            <div
              key={item.variantId}
              className={[
                'flex gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors',
                selected.has(item.variantId) ? 'border-blue-200' : 'border-gray-100',
              ].join(' ')}
            >
              {/* Checkbox */}
              <div className="flex items-center pt-1">
                <input
                  type="checkbox"
                  checked={selected.has(item.variantId)}
                  onChange={() => toggleItem(item.variantId)}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Image */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                {item.productImage ? (
                  <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <Smartphone className="h-9 w-9" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div>
                  <p className="font-medium text-gray-800 line-clamp-1">{item.productName}</p>
                  {item.variantName && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.variantName}</p>
                  )}
                  {!item.inStock && (
                    <p className="text-xs text-red-500 mt-0.5">{t('products.outOfStock')}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity - 1 })}
                      disabled={item.quantity <= 1 || update.isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => update.mutate({ variantId: item.variantId, quantity: item.quantity + 1 })}
                      disabled={item.quantity >= item.stock || update.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="font-bold text-blue-600">{formatCurrency(item.lineTotal)}</span>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500"
                    onClick={() => remove.mutate(item.variantId)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm h-fit sticky top-20">
          <h2 className="mb-4 font-semibold text-gray-900">{t('checkout.orderSummary')}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t('cart.subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('cart.shippingFee')}</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
              <span>{t('cart.total')}</span>
              <span className="text-blue-600">{formatCurrency(subtotal)}</span>
            </div>
          </div>
          <Button
            className="mt-4 w-full" size="lg"
            onClick={handleCheckout}
            disabled={selected.size === 0}
          >
            {t('cart.checkout')} ({selected.size})
          </Button>
        </div>
      </div>
    </div>
  )
}
