export type PaymentGateway = 'RAZORPAY' | 'MANUAL_QR' | 'FREE';

export interface CreatePaymentDto {
    itemType: 'COURSE' | 'SECTION';
    courseId?: string;
    sectionId?: string;
    couponCode?: string;
}

export interface PaymentResponse {
    paymentId: string;
    amount?: number;
    currency?: string;
    status?: string;
    qrSettings?: {
        qrImageUrl: string | null;
        upiId: string | null;
        bankName: string | null;
        bankAccountNumber: string | null;
        bankIfsc: string | null;
        bankAccountHolder: string | null;
        instructions: string | null;
    };
}
