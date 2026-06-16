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
    it('allows PENDING_PAYMENT → PENDING_PICKUP', () => {
      expect(
        canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_PICKUP),
      ).toBe(true);
    });

    it('allows PENDING_PAYMENT → CANCELLED', () => {
      expect(
        canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED),
      ).toBe(true);
    });

    it('blocks skipping PENDING_PAYMENT → DELIVERED', () => {
      expect(
        canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED),
      ).toBe(false);
    });

    it('blocks going backwards DELIVERED → PENDING_PAYMENT', () => {
      expect(
        canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT),
      ).toBe(false);
    });

    it('allows DELIVERED → RETURNED', () => {
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.RETURNED)).toBe(
        true,
      );
    });
  });

  describe('isTerminal', () => {
    it('CANCELLED is terminal', () => {
      expect(isTerminal(OrderStatus.CANCELLED)).toBe(true);
    });
    it('RETURNED is terminal', () => {
      expect(isTerminal(OrderStatus.RETURNED)).toBe(true);
    });
    it('PENDING_PAYMENT is not terminal', () => {
      expect(isTerminal(OrderStatus.PENDING_PAYMENT)).toBe(false);
    });
  });

  describe('shouldReleaseStock', () => {
    it('CANCELLED releases stock', () => {
      expect(shouldReleaseStock(OrderStatus.CANCELLED)).toBe(true);
    });
    it('RETURNED releases stock', () => {
      expect(shouldReleaseStock(OrderStatus.RETURNED)).toBe(true);
    });
    it('DELIVERED does not release stock', () => {
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
    it('does not throw when transition is valid', () => {
      expect(() =>
        assertTransition(
          OrderStatus.PENDING_PAYMENT,
          OrderStatus.PENDING_PICKUP,
        ),
      ).not.toThrow();
    });

    it('throws when transition is invalid', () => {
      expect(() =>
        assertTransition(OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT),
      ).toThrow();
    });

    it('throws when status stays the same', () => {
      expect(() =>
        assertTransition(OrderStatus.DELIVERED, OrderStatus.DELIVERED),
      ).toThrow();
    });
  });
});
