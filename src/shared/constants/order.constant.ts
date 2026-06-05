export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PENDING_PICKUP: 'PENDING_PICKUP',
  PENDING_DELIVERY: 'PENDING_DELIVERY',
  DELIVERED: 'DELIVERED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Transition map: từ trạng thái hiện tại → các trạng thái được phép chuyển tới.
 * RETURNED và CANCELLED là trạng thái cuối (terminal) — không đi tiếp.
 *
 *   PENDING_PAYMENT  → PENDING_PICKUP | CANCELLED
 *   PENDING_PICKUP   → PENDING_DELIVERY | CANCELLED
 *   PENDING_DELIVERY → DELIVERED | RETURNED
 *   DELIVERED        → RETURNED
 *   RETURNED         → (cuối)
 *   CANCELLED        → (cuối)
 */
export const ORDER_TRANSITIONS: Record<OrderStatusType, OrderStatusType[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PENDING_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PENDING_PICKUP]: [
    OrderStatus.PENDING_DELIVERY,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PENDING_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.RETURNED,
  ],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Trạng thái cần hoàn kho khi chuyển tới (release stock)
export const STOCK_RELEASE_STATUSES: OrderStatusType[] = [
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
];
