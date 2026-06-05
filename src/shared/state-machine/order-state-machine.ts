import { ConflictException } from '@nestjs/common';
import {
  ORDER_TRANSITIONS,
  OrderStatusType,
  STOCK_RELEASE_STATUSES,
} from '@/shared/constants/order.constant';

/**
 * State machine cho Order — pure functions, không phụ thuộc DB.
 * Quản lý luật chuyển trạng thái: từ A có được sang B không.
 */

/** Kiểm tra chuyển từ `from` sang `to` có hợp lệ không. */
export function canTransition(
  from: OrderStatusType,
  to: OrderStatusType,
): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Danh sách trạng thái có thể chuyển tới từ trạng thái hiện tại. */
export function getNextStatuses(from: OrderStatusType): OrderStatusType[] {
  return ORDER_TRANSITIONS[from] ?? [];
}

/** Trạng thái cuối (không chuyển đi đâu được nữa). */
export function isTerminal(status: OrderStatusType): boolean {
  return getNextStatuses(status).length === 0;
}

/** Chuyển trạng thái này có cần hoàn kho không (cancel/return). */
export function shouldReleaseStock(to: OrderStatusType): boolean {
  return STOCK_RELEASE_STATUSES.includes(to);
}

/**
 * Đảm bảo transition hợp lệ — throw 409 nếu không.
 * Gọi trong service trước khi update DB.
 */
export function assertTransition(
  from: OrderStatusType,
  to: OrderStatusType,
): void {
  if (from === to) {
    throw new ConflictException({
      message: `Order is already in status ${to}`,
      path: 'status',
    });
  }
  if (!canTransition(from, to)) {
    const allowed = getNextStatuses(from);
    throw new ConflictException({
      message: `Cannot transition from ${from} to ${to}. Allowed: ${
        allowed.length ? allowed.join(', ') : 'none (terminal state)'
      }`,
      path: 'status',
    });
  }
}
