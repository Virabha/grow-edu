"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Receipt, Search } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import {
  OrderStatusChip,
  RefundStatusChip,
} from "@/components/orders/order-status-chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SecureImage } from "@/components/ui/secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrder, useOrders } from "@/lib/hooks/use-orders";
import { formatDate, formatMoney } from "@/lib/format";
import { getApiError } from "@/lib/api/errors";

const STATUSES = [
  { value: "all", label: "All orders" },
  { value: "COMPLETED", label: "Paid" },
  { value: "PROOF_UPLOADED", label: "Under review" },
  { value: "PENDING", label: "Awaiting payment" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

function OrdersView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [deepLinkDismissed, setDeepLinkDismissed] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, error, refetch } = useOrders({
    status,
    search: debouncedSearch || undefined,
    page,
    limit: 8,
  });

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  // Deep link from the dashboard: /orders?order=ord-2026-0188.
  // Held as an id and fetched on its own, so the dialog always shows current
  // data after a refund and the link resolves even when the order is not on
  // the page currently listed.
  const deepLinkId = searchParams.get("order");
  const openOrderId =
    pickedId ?? (deepLinkDismissed ? null : deepLinkId) ?? null;
  const { data: selected } = useOrder(openOrderId);

  function closeDetail(open: boolean) {
    if (!open) {
      setPickedId(null);
      if (deepLinkId) {
        setDeepLinkDismissed(true);
        router.replace("/orders");
      }
    }
  }

  return (
    <PageLayout
      subtitle="Billing"
      header="Order history"
      description="Every purchase, its invoice, and where a refund stands."
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or course…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-8 text-sm"
              aria-label="Search orders"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <EmptyState
            title="We could not load your orders"
            description={getApiError(error, "Please try again.").message}
            icon={<Receipt className="size-10" />}
            action={{ label: "Try again", onClick: () => void refetch() }}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title={
              search || status !== "all"
                ? "No orders match those filters"
                : "No orders yet"
            }
            description={
              search || status !== "all"
                ? "Try a different search term or clear the status filter."
                : "When you buy a course, the invoice will appear here."
            }
            icon={<Receipt className="size-10" />}
            action={
              search || status !== "all"
                ? {
                    label: "Clear filters",
                    onClick: () => {
                      setSearch("");
                      setStatus("all");
                      setPage(1);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {orders.map((order) => {
              const [firstItem] = order.items;
              const extra = order.items.length - 1;
              return (
                <li
                  key={order.orderId}
                  className="rounded-xl border border-border/70 bg-card/85 p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                        {firstItem ? (
                          <SecureImage
                            src={firstItem.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {firstItem?.title ?? order.invoiceNo}
                          {extra > 0 && (
                            <span className="text-muted-foreground">
                              {" "}
                              + {extra} more
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.invoiceNo} · {formatDate(order.placedAt)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <OrderStatusChip status={order.status} />
                          <RefundStatusChip status={order.refundStatus} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                      <p className="text-base font-medium tabular-nums">
                        {formatMoney(order.total, order.currency)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setPickedId(order.orderId)}
                      >
                        View invoice
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </div>

      <OrderDetailDialog
        order={selected ?? null}
        open={!!openOrderId && !!selected}
        onOpenChange={closeDetail}
      />
    </PageLayout>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <PageLayout header="Order history">
          <Skeleton className="h-64 w-full rounded-xl" />
        </PageLayout>
      }
    >
      <OrdersView />
    </Suspense>
  );
}
