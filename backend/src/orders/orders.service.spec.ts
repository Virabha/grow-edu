import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

function terminal<T>(value: T) {
  return jest.fn().mockResolvedValue(value);
}

function chain(overrides: Record<string, jest.Mock> = {}) {
  const c: Record<string, jest.Mock> = {
    from: jest.fn().mockImplementation(() => c),
    where: jest.fn().mockImplementation(() => c),
    leftJoin: jest.fn().mockImplementation(() => c),
    innerJoin: jest.fn().mockImplementation(() => c),
    orderBy: jest.fn().mockImplementation(() => c),
    limit: jest.fn().mockImplementation(() => c),
    offset: jest.fn().mockImplementation(() => c),
    ...overrides,
  };
  return c;
}

function makeService(selectImpl: jest.Mock): OrdersService {
  const db = { select: selectImpl } as never;
  return new (OrdersService as new (db: never) => OrdersService)(db);
}

const completedPayment = {
  paymentId: 'pay-1',
  userId: 'user-1',
  batchId: 'bat-1',
  itemType: 'BATCH' as const,
  amount: '1000.00',
  originalAmount: '1000.00',
  discountAmount: '0.00',
  taxAmount: '0.00',
  couponId: null,
  currency: 'INR',
  gateway: 'MANUAL_QR' as const,
  status: 'COMPLETED' as const,
  invoiceNo: null,
  refundStatus: 'NONE' as const,
  refundReason: null,
  transactionId: null,
  payerName: null,
  paymentProofUrl: null,
  createdAt: new Date('2026-01-01'),
  metadata: null,
};

describe('OrdersService', () => {
  describe('getOrder', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      const c = chain({ where: terminal([]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(service.getOrder('no-such-id', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("throws NotFoundException (not 403) for a different user's order", async () => {
      const payment = { ...completedPayment, userId: 'user-2' };
      const c = chain({ where: terminal([payment]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(service.getOrder('pay-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('requestRefund', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      const c = chain({ where: terminal([]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.requestRefund('no-such-id', 'user-1', { reason: 'I want a refund please' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException for another user's order", async () => {
      const payment = { ...completedPayment, userId: 'user-2' };
      const c = chain({ where: terminal([payment]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.requestRefund('pay-1', 'user-1', { reason: 'I want a refund please' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the order is not COMPLETED', async () => {
      const payment = { ...completedPayment, status: 'PENDING' as const };
      const c = chain({ where: terminal([payment]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.requestRefund('pay-1', 'user-1', { reason: 'I want a refund please' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when a refund request already exists', async () => {
      const payment = { ...completedPayment, refundStatus: 'REQUESTED' as const };
      const c = chain({ where: terminal([payment]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.requestRefund('pay-1', 'user-1', { reason: 'I want a refund please' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when a refund is already APPROVED', async () => {
      const payment = { ...completedPayment, refundStatus: 'APPROVED' as const };
      const c = chain({ where: terminal([payment]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.requestRefund('pay-1', 'user-1', { reason: 'I want a refund please' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('adminResolveRefund', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      const c = chain({ where: terminal([]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.adminResolveRefund('no-such-id', 'admin-1', { status: 'DECLINED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when refundStatus is not REQUESTED', async () => {
      const payment = { ...completedPayment, refundStatus: 'NONE' as const };
      const c = chain({ where: terminal([payment]) });
      const service = makeService(jest.fn().mockReturnValue(c));
      await expect(
        service.adminResolveRefund('pay-1', 'admin-1', { status: 'APPROVED' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resolveItemMap via adminListOrders', () => {
    it('resolves every batch title in one query, not one per order', async () => {
      const base = {
        amount: '1500.00',
        originalAmount: '1500.00',
        discountAmount: '0.00',
        taxAmount: '0.00',
        invoiceNo: null,
        currency: 'INR',
        gateway: 'MANUAL_QR' as const,
        refundStatus: 'NONE' as const,
        refundReason: null,
        transactionId: null,
        payerName: 'Alice',
        paymentProofUrl: null,
        itemType: 'BATCH' as const,
        userEmail: 'alice@example.com',
        userFirstName: 'Alice',
        userLastName: null,
      };
      const first = {
        ...base,
        paymentId: 'pay-1',
        batchId: 'bat-1',
        status: 'COMPLETED' as const,
        createdAt: new Date('2026-02-01'),
        metadata: null,
      };
      const second = {
        ...base,
        paymentId: 'pay-2',
        batchId: 'bat-2',
        status: 'PENDING' as const,
        createdAt: new Date('2026-01-15'),
        metadata: { batchTitle: 'Stale snapshot' },
      };

      const dataChain = chain({ offset: terminal([first, second]) });
      const countChain = chain({ where: terminal([{ total: 2 }]) });
      const batchesChain = chain({
        where: terminal([
          { batchId: 'bat-1', title: 'NEET Dropper', thumbnail: '/neet.jpg' },
          { batchId: 'bat-2', title: 'JEE Advanced', thumbnail: '/jee.jpg' },
        ]),
      });

      let call = 0;
      const dbSelect = jest.fn().mockImplementation(() => {
        call++;
        if (call === 1) return dataChain;
        if (call === 2) return countChain;
        return batchesChain;
      });

      const service = makeService(dbSelect);
      const result = await service.adminListOrders({ page: 1, limit: 20 });

      expect(result.data.find((o) => o.orderId === 'pay-1')?.items[0]?.title).toBe(
        'NEET Dropper',
      );
      expect(result.data.find((o) => o.orderId === 'pay-2')?.items[0]?.title).toBe(
        'JEE Advanced',
      );
      expect(dbSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('adminListOrders status filter', () => {
    it('passes a WHERE condition when a valid status is supplied', async () => {
      let capturedWhere: unknown = 'NOT_SET';

      const dataChain = chain({
        where: jest.fn().mockImplementation((cond: unknown) => {
          capturedWhere = cond;
          return chain({ offset: terminal([]) });
        }),
      });
      const countChain = chain({ where: terminal([{ total: 0 }]) });

      let call = 0;
      const dbSelect = jest.fn().mockImplementation(() => {
        call++;
        return call === 1 ? dataChain : countChain;
      });

      const service = makeService(dbSelect);
      await service.adminListOrders({ status: 'COMPLETED', page: 1, limit: 10 });

      expect(capturedWhere).not.toBeUndefined();
      expect(capturedWhere).not.toBe('NOT_SET');
    });

    it('still excludes corporate invoices when status is "all"', async () => {
      let capturedWhere: unknown = 'NOT_SET';

      const dataChain = chain({
        where: jest.fn().mockImplementation((cond: unknown) => {
          capturedWhere = cond;
          return chain({ offset: terminal([]) });
        }),
      });
      const countChain = chain({ where: terminal([{ total: 0 }]) });

      let call = 0;
      const dbSelect = jest.fn().mockImplementation(() => {
        call++;
        return call === 1 ? dataChain : countChain;
      });

      const service = makeService(dbSelect);
      await service.adminListOrders({ status: 'all', page: 1, limit: 10 });

      expect(capturedWhere).not.toBeUndefined();
      expect(capturedWhere).not.toBe('NOT_SET');
    });
  });
});
