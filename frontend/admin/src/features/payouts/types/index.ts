export type PayoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface PayoutRequest {
  payoutId: string;
  instructorId: string;
  amount: string;
  currency: string;
  method: string;
  accountDetails: string | null;
  status: PayoutStatus;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EarningsSummary {
  lifetimeGross: number;
  coursesSold: number;
  totalPayout: number;
  currentBalance: number;
}

export interface PayoutHistoryResponse {
  data: PayoutRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SaleRow {
  paymentId: string;
  courseId: string;
  courseTitle: string;
  buyerName: string;
  buyerEmail: string;
  mainPrice: number;
  yourCommission: number;
  currency: string;
  date: string;
}

export interface SalesResponse {
  data: SaleRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePayoutRequest {
  amount: number;
  method: string;
  accountDetails?: string;
}
