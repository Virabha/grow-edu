"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface QRPaymentSettings {
  qrImageUrl: string | null;
  upiId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankAccountHolder: string | null;
  instructions: string | null;
}

export interface CreateManualQRResponse {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  qrSettings: QRPaymentSettings;
}

interface UploadProofParams {
  paymentId: string;
  proofUrl: string;
  transactionId: string;
  payerName?: string;
}

export function useUploadProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, ...body }: UploadProofParams) =>
      apiClient
        .post(`/payments/${paymentId}/upload-proof`, body)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useQRSettings() {
  return useQuery<QRPaymentSettings>({
    queryKey: ["payments", "qr-settings"],
    queryFn: () => apiClient.get<QRPaymentSettings>("/payments/qr-settings").then((r) => r.data),
  });
}

export function useMyPayment(paymentId: string | null) {
  return useQuery({
    queryKey: ["payments", "mine", paymentId],
    enabled: !!paymentId,
    queryFn: () =>
      apiClient.get(`/payments/my/${paymentId}`).then((r) => r.data),
  });
}
