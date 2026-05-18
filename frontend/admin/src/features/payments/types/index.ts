export type PaymentGateway = 'RAZORPAY' | 'STRIPE_US' | 'STRIPE_UAE';
export interface CreatePaymentDto {
    gateway: PaymentGateway;
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
}
export interface CreateBulkPaymentDto {
    gateway: PaymentGateway;
    cartItemIds: string[];
    couponCode?: string;
    successUrl?: string;
    cancelUrl?: string;
}
export interface PaymentResponse {
    paymentId: string;
    paymentIds?: string[];
    checkoutUrl?: string | null;
    sessionId?: string | null;
    clientReferenceId?: string | null;
}
export interface VerifyPaymentDto {
    paymentId?: string;
    paymentIds?: string[];
    sessionId?: string;
}
export interface VerifyPaymentResponse {
    success: boolean;
    message: string;
    processedCount?: number;
}
