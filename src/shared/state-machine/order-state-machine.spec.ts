import { OrderStatus } from '@/shared/constants/order.constant';
import {
  assertTransition,
  canTransition,
  getNextStatuses,
  isTerminal,
  shouldReleaseStock,
} from './order-state-machine';

describe('OrderStateMachine', () => {
  describe('canTransition', () => {
    it('cho phép PENDING_PAYMENT → PENDING_PICKUP', () => {
      expect(
        canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_PICKUP),
      ).toBe(true);
    });

    it('cho phép PENDING_PAYMENT → CANCELLED', () => {
      expect(
        canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED),
      ).toBe(true);
    });

    it('CẤM nhảy cóc PENDING_PAYMENT → DELIVERED', () => {
      expect(
        canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED),
      ).toBe(false);
    });

    it('CẤM đi ngược DELIVERED → PENDING_PAYMENT', () => {
      expect(
        canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT),
      ).toBe(false);
    });

    it('cho phép DELIVERED → RETURNED', () => {
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.RETURNED)).toBe(
        true,
      );
    });
  });

  describe('isTerminal', () => {
    it('CANCELLED là terminal', () => {
      expect(isTerminal(OrderStatus.CANCELLED)).toBe(true);
    });
    it('RETURNED là terminal', () => {
      expect(isTerminal(OrderStatus.RETURNED)).toBe(true);
    });
    it('PENDING_PAYMENT KHÔNG terminal', () => {
      expect(isTerminal(OrderStatus.PENDING_PAYMENT)).toBe(false);
    });
  });

  describe('shouldReleaseStock', () => {
    it('CANCELLED → hoàn kho', () => {
      expect(shouldReleaseStock(OrderStatus.CANCELLED)).toBe(true);
    });
    it('RETURNED → hoàn kho', () => {
      expect(shouldReleaseStock(OrderStatus.RETURNED)).toBe(true);
    });
    it('DELIVERED → KHÔNG hoàn kho', () => {
      expect(shouldReleaseStock(OrderStatus.DELIVERED)).toBe(false);
    });
  });

  describe('getNextStatuses', () => {
    it('PENDING_DELIVERY → [DELIVERED, RETURNED]', () => {
      expect(getNextStatuses(OrderStatus.PENDING_DELIVERY)).toEqual([
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,
      ]);
    });
    it('CANCELLED → [] (terminal)', () => {
      expect(getNextStatuses(OrderStatus.CANCELLED)).toEqual([]);
    });
  });

  describe('assertTransition', () => {
    it('không throw khi hợp lệ', () => {
      expect(() =>
        assertTransition(
          OrderStatus.PENDING_PAYMENT,
          OrderStatus.PENDING_PICKUP,
        ),
      ).not.toThrow();
    });

    it('throw khi transition sai', () => {
      expect(() =>
        assertTransition(OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT),
      ).toThrow();
    });

    it('throw khi giữ nguyên status', () => {
      expect(() =>
        assertTransition(OrderStatus.DELIVERED, OrderStatus.DELIVERED),
      ).toThrow();
    });
  });
});
