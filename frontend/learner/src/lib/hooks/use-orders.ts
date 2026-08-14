"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export type OrderStatus =
  | "COMPLETED"
  | "PENDING"
  | "PROOF_UPLOADED"
  | "FAILED"
  | "REFUNDED";

export type RefundStatus = "NONE" | "REQUESTED" | "APPROVED" | "DECLINED";

export interface OrderItem {
  itemId: string;
  courseId: string;
  title: string;
  thumbnail: string;
  itemType: "COURSE" | "SECTION" | "BOOK";
  unitPrice: number;
}

export interface Order {
  orderId: string;
  invoiceNo: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  tax: number;
  total: number;
  currency: string;
  gateway: "RAZORPAY" | "MANUAL_QR" | "FREE";
  status: OrderStatus;
  refundStatus: RefundStatus;
  refundReason: string | null;
  transactionId: string | null;
  placedAt: string;
  billingName: string;
  billingEmail: string;
}

interface OrdersResponse {
  data: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface OrdersFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useOrders(filters?: OrdersFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient
        .get<OrdersResponse>("/orders", { params: filters })
        .then((r) => r.data),
  });
}

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: queryKeys.orders.byId(orderId ?? ""),
    enabled: !!orderId,
    queryFn: () =>
      apiClient.get<Order>(`/orders/${orderId}`).then((r) => r.data),
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiClient
        .post<Order>(`/orders/${orderId}/refund-request`, { reason })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
