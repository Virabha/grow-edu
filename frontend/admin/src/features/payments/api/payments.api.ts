import { apiClient } from '@/lib/api/client';

export interface Payment {
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    gateway: string;
    gatewayId?: string;
    createdAt: string;
    updatedAt?: string;
    userId?: string;
    courseId?: string;
    sectionId?: string;
    itemType?: string;
    originalAmount?: number;
    discountAmount?: number;
    couponId?: string;
    metadata?: Record<string, string>;
    paymentProofUrl?: string | null;
    transactionId?: string | null;
    payerName?: string | null;
    proofUploadedAt?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    reviewNotes?: string | null;
}

export interface PaymentDetail extends Payment {
    user?: { userId: string; email: string; firstName?: string; lastName?: string };
    course?: { courseId: string; title: string; slug: string };
    section?: { sectionId: string; title: string };
    coupon?: { couponId: string; couponCode: string; discountType: string; discountValue: string };
}

export interface PaymentsResponse {
    data: Payment[];
    pagination?: { page: number; limit: number; total: number; totalPages?: number };
}

export const paymentsApi = {
    async getAll(filters?: {
        search?: string;
        page?: number;
        limit?: number;
        status?: string;
        gateway?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<PaymentsResponse> {
        const params = new URLSearchParams();
        if (filters?.search) params.set('search', filters.search);
        if (filters?.page) params.set('page', filters.page.toString());
        if (filters?.limit) params.set('limit', filters.limit.toString());
        if (filters?.status) params.set('status', filters.status);
        if (filters?.gateway) params.set('gateway', filters.gateway);
        if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters?.dateTo) params.set('dateTo', filters.dateTo);
        const { data } = await apiClient.get<Payment[] | PaymentsResponse>(`/payments?${params.toString()}`);
        if (Array.isArray(data)) return { data };
        return data as PaymentsResponse;
    },
    async getById(id: string): Promise<PaymentDetail> {
        const { data } = await apiClient.get<PaymentDetail>(`/payments/${id}`);
        return data as PaymentDetail;
    },
};
