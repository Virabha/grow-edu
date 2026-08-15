import { apiClient } from '@/lib/api/client';
import type {
  CreatePayoutRequest,
  EarningsSummary,
  PayoutHistoryResponse,
  SalesResponse,
} from '../types';

export const payoutsApi = {
  async getEarnings(): Promise<EarningsSummary> {
    const { data } = await apiClient.get<EarningsSummary>('/payouts/earnings');
    return data;
  },

  async getHistory(page = 1, limit = 20): Promise<PayoutHistoryResponse> {
    const { data } = await apiClient.get<PayoutHistoryResponse>('/payouts', {
      params: { page, limit },
    });
    return data;
  },

  async create(payload: CreatePayoutRequest): Promise<void> {
    await apiClient.post('/payouts', payload);
  },

  async cancel(payoutId: string): Promise<void> {
    await apiClient.delete(`/payouts/${payoutId}`);
  },

  async getSales(page = 1, limit = 20): Promise<SalesResponse> {
    const { data } = await apiClient.get<SalesResponse>('/payouts/sales', {
      params: { page, limit },
    });
    return data;
  },
};
