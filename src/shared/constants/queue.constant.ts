export const QueueName = {
  EMAIL: 'email',
  INVENTORY_SYNC: 'inventory-sync',
  REPORT_GEN: 'report-gen',
} as const;

export const EmailJobName = {
  ORDER_CONFIRMATION: 'order-confirmation',
  ORDER_INVOICE: 'order-invoice',
  DEPOSIT_APPROVED: 'deposit-approved',
  DEPOSIT_REJECTED: 'deposit-rejected',
  WITHDRAW_APPROVED: 'withdraw-approved',
  SELLER_APPROVED: 'seller-approved',
  SELLER_REJECTED: 'seller-rejected',
} as const;

export const InventoryJobName = {
  RELEASE_STOCK: 'release-stock',
} as const;

export const ReportJobName = {
  DAILY_REVENUE: 'daily-revenue',
} as const;

export const PubSubEvent = {
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
} as const;
