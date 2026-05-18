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

export interface QRPaymentSettings {
    qrImageUrl: string | null;
    upiId: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    bankAccountHolder: string | null;
    instructions: string | null;
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
    async getPendingReview(page = 1, limit = 50): Promise<PaymentsResponse> {
        const { data } = await apiClient.get<PaymentsResponse>(`/payments/pending-review?page=${page}&limit=${limit}`);
        return data as PaymentsResponse;
    },
    async approve(paymentId: string, notes?: string) {
        const { data } = await apiClient.post(`/payments/${paymentId}/approve`, { notes });
        return data;
    },
    async reject(paymentId: string, notes: string) {
        const { data } = await apiClient.post(`/payments/${paymentId}/reject`, { notes });
        return data;
    },
    async getQRSettings(): Promise<QRPaymentSettings> {
        const { data } = await apiClient.get<QRPaymentSettings>('/payments/qr-settings');
        return data as QRPaymentSettings;
    },
    async updateQRSettings(input: Partial<QRPaymentSettings>): Promise<QRPaymentSettings> {
        const { data } = await apiClient.patch<QRPaymentSettings>('/payments/qr-settings', input);
        return data as QRPaymentSettings;
    },
};
