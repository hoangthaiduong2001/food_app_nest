import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, ArrowLeft, Minus, Plus, Package, MessageCircle, Phone, Store, ChevronRight, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { productService } from '@/services/product.service'
import { cartService } from '@/services/cart.service'
import { useCartStore } from '@/stores/cart.store'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { ChatDrawer } from '@/components/chat/ChatDrawer'
import type { ProductVariant } from '@/types'

export default function ProductDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const setCart = useCartStore((s) => s.setCart)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.get(Number(id)),
    enabled: !!id,
  })

  const addToCart = useMutation({
    mutationFn: () => {
      const v = product?.variants ?? []
      const variantId = selectedVariantId ?? v.find((x) => x.isDefault)?.id ?? v[0]?.id
      if (!variantId) throw new Error('Please select a version')
      return cartService.addItem(variantId, quantity)
    },
    onSuccess: (cart) => {
      setCart(cart)
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast.success(t('products.addedToCart'))
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!product) return <div className="py-20 text-center text-gray-500">{t('common.noData')}</div>

  const variants = product.variants ?? []
  const selectedVariant: ProductVariant | undefined =
    variants.find((v) => v.id === selectedVariantId) ??
    variants.find((v) => v.isDefault) ??
    variants[0]

  const price = selectedVariant?.price ?? product.basePrice
  const inStock = (selectedVariant?.stock ?? product.totalStock) > 0

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('common.back')}
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div>
          <div className="overflow-hidden rounded-xl bg-gray-50 aspect-square">
            {product.images[activeImage] ? (
              <img src={product.images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <Package className="h-24 w-24" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === activeImage ? 'border-blue-600' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(product.categories ?? []).map((c) => (
                <Badge key={c.id} variant="secondary">{c.name}</Badge>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-blue-600">{formatCurrency(price)}</span>
            {product.virtualPrice > price && (
              <span className="text-lg text-gray-400 line-through">{formatCurrency(product.virtualPrice)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {t('products.inStock')}: <strong>{selectedVariant?.stock ?? product.totalStock}</strong>
            </span>
          </div>

          {product.description && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t('products.description')}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {product.description}
              </p>
            </div>
          )}

          {variants.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">{t('products.version')}:</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    disabled={v.stock === 0}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                      (selectedVariantId === v.id || (!selectedVariantId && v.isDefault))
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {v.name ?? v.sku}
                    {v.price !== product.basePrice && (
                      <span className="ml-1 text-xs text-gray-500">{formatCurrency(v.price)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">{t('products.quantity')}:</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium text-lg">{quantity}</span>
              <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(selectedVariant?.stock ?? 99, quantity + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {isAuthenticated ? (
              <Button size="lg" className="flex-1" disabled={!inStock || addToCart.isPending} onClick={() => addToCart.mutate()}>
                {addToCart.isPending ? <Spinner size="sm" className="mr-2" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                {inStock ? t('products.addToCart') : t('products.outOfStock')}
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={() => navigate('/login')}>
                {t('products.loginToAdd')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Seller info card */}
      {product.seller && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Thông tin người bán</p>
          </div>
          <div className="flex items-center gap-4 p-5">
            {/* Logo / avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100">
              {product.seller.logo
                ? <img src={product.seller.logo} alt={product.seller.shopName} className="h-full w-full object-cover" />
                : <Store className="h-7 w-7 text-orange-500" />
              }
            </div>

            {/* Shop info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900">{product.seller.shopName}</p>
              {product.seller.phone && (
                <div className="mt-0.5 flex items-center gap-1 text-sm text-gray-500">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{product.seller.phone}</span>
                </div>
              )}
              {product.seller.address && (
                <div className="mt-0.5 flex items-start gap-1 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{product.seller.address}</span>
                </div>
              )}
              <button
                onClick={() => navigate(`/products?sellerId=${product.seller!.id}&shop=${encodeURIComponent(product.seller!.shopName)}`)}
                className="mt-1.5 flex items-center gap-0.5 text-xs font-medium text-orange-500 hover:text-orange-600"
              >
                Xem tất cả sản phẩm của shop <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Chat button */}
            <div className="flex flex-col items-end gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat ngay
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 rounded-full border border-orange-400 px-4 py-2 text-sm font-semibold text-orange-500 transition hover:bg-orange-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Đăng nhập để chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat drawer */}
      {chatOpen && product.seller && (
        <ChatDrawer
          seller={product.seller}
          productName={product.name}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}
