export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_PICKUP'
  | 'PENDING_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
export type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'E_WALLET' | 'CREDIT_CARD'
export type WalletTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'PAYMENT'
  | 'REFUND'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
export type Currency = 'VND' | 'USD' | 'GBP' | 'JPY' | 'KRW' | 'CNY'
export type DepositRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface User {
  id: number
  email: string
  name: string
  phone?: string
  address?: string
  avatar?: string
  status: UserStatus
  roleId: number
  roleName: string
}

// Shape trả về từ GET /auth/me và PATCH /auth/me
export interface MeProfile {
  userId: number
  username: string
  email: string
  phone: string
  address: string | null
  avatar: string | null
  roleId: number
  roleName: string
}

export interface UpdateProfilePayload {
  name?: string
  phoneNumber?: string
  address?: string | null
  avatar?: string | null
}

export interface AdminUser {
  id: number
  email: string
  name: string
  phoneNumber: string
  avatar: string | null
  status: UserStatus
  roleId: number
  role: { id: number; name: string }
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface Brand {
  id: number
  name: string
  logo: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  logo?: string
  parentCategoryId?: number
  childrenCategories?: Category[]
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: number
  productId: number
  sku: string
  name?: string
  price: number
  stock: number
  attributes?: Record<string, string>
  isDefault: boolean
  isActive: boolean
}

export interface Product {
  id: number
  name: string
  description: string | null
  basePrice: number
  virtualPrice: number
  totalStock: number
  isActive: boolean
  slug?: string
  brandId: number
  images: string[]
  publishedAt?: string
  createdAt: string
  updatedAt: string
  categories: Category[]
  variants: ProductVariant[]
}

export interface CartItem {
  variantId: number
  quantity: number
  sku: string
  variantName: string | null
  price: number
  stock: number
  productId: number
  productName: string
  productImage: string | null
  lineTotal: number
  inStock: boolean
}

export interface Cart {
  items: CartItem[]
  totalItems: number
  totalAmount: number
}

export interface ReceiverInfo {
  name: string
  phone: string
  address: string
}

export interface OrderItem {
  id: number
  productId: number
  variantId: number | null
  quantity: number
  unitPrice: number
  totalPrice: number
  productName: string
  productImage: string | null
}

// List item — BE omits items, receiver required
export interface OrderListItem {
  id: number
  userId: number
  status: OrderStatus
  paymentStatus: string
  paymentMethod: string
  shippingFee: number
  totalAmount: number
  finalAmount: number
  receiver: ReceiverInfo
  user?: { id: number; name: string; email: string }
  createdAt: string
}

// Detail — includes items, receiver required
export interface Order extends OrderListItem {
  items: OrderItem[]
}

export interface Wallet {
  accountNumber: string
  balance: number
  currency: Currency
}

export interface WalletTransaction {
  id: number
  type: WalletTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  originalAmount?: number
  originalCurrency?: Currency
  exchangeRate?: number
  orderId?: number
  counterpartyAccount?: string
  description?: string
  createdAt: string
}

export interface DepositRequest {
  id: number
  userId: number
  type: 'DEPOSIT' | 'WITHDRAW'
  currency: Currency
  amount: number
  status: DepositRequestStatus
  note?: string
  rejectReason?: string
  createdAt: string
  updatedAt: string
}

export interface ExchangeRate {
  id: number
  fromCurrency: Currency
  toCurrency: Currency
  rate: number
}

export interface PaginationMeta {
  nextCursor: number | null
  hasMore: boolean
}
