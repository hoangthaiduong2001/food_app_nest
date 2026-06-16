import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email/email.service';
import { OrderGateway } from '../gateway/order.gateway';
import { NotificationService } from './notification.service';

const mockGateway = {
  emitNotification: jest.fn(),
  emitOrderStatusChanged: jest.fn(),
};

const mockEmail = {
  enqueue: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: OrderGateway, useValue: mockGateway },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get(NotificationService);
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('emits WebSocket notification to correct userId', () => {
      service.send({ userId: 5, title: 'Test', body: 'Hello', type: 'order' });

      expect(mockGateway.emitNotification).toHaveBeenCalledWith(5, {
        title: 'Test',
        body: 'Hello',
        type: 'order',
      });
    });

    it('enqueues email when email payload is provided', async () => {
      mockEmail.enqueue.mockResolvedValue(undefined);

      service.send({
        userId: 5,
        title: 'Test',
        body: 'Hello',
        type: 'order',
        email: { to: 'user@test.com', jobName: 'order-confirm', payload: { orderId: 1 } },
      });

      await Promise.resolve();
      expect(mockEmail.enqueue).toHaveBeenCalledWith('order-confirm', {
        to: 'user@test.com',
        orderId: 1,
      });
    });

    it('does not enqueue email when email payload is absent', () => {
      service.send({ userId: 5, title: 'Test', body: 'Hello', type: 'system' });

      expect(mockEmail.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('notifyOrderStatusChanged', () => {
    it('emits order status changed and sends in-app notification', () => {
      service.notifyOrderStatusChanged({ userId: 10, orderId: 1, status: 'DELIVERED' });

      expect(mockGateway.emitOrderStatusChanged).toHaveBeenCalledWith(1, 'DELIVERED', 10);
      expect(mockGateway.emitNotification).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ type: 'order' }),
      );
    });
  });

  describe('notifySellerNewOrder', () => {
    it('sends notification to seller with correct content', () => {
      service.notifySellerNewOrder({
        sellerUserId: 20,
        orderId: 5,
        buyerName: 'Nguyen Van A',
        itemCount: 3,
        finalAmount: 250_000,
      });

      expect(mockGateway.emitNotification).toHaveBeenCalledWith(
        20,
        expect.objectContaining({ title: 'Đơn hàng mới', type: 'order' }),
      );
    });
  });
});
