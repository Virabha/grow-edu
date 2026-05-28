"use client";
import { useCallback, useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import {
  usePayments,
  usePaymentById,
} from "@/features/payments/hooks/use-payments";
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge";
import { PaymentDetailSheet } from "@/features/payments/components/payment-detail-sheet";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "PENDING", label: "Pending" },
  { value: "PROOF_UPLOADED", label: "Awaiting review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

const GATEWAY_OPTIONS = [
  { value: "all", label: "All gateways" },
  { value: "MANUAL_QR", label: "Manual QR" },
  { value: "RAZORPAY", label: "Razorpay" },
  { value: "FREE", label: "Free" },
];

export default function PaymentManagementPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");

  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: paymentsData, isLoading, isFetching } = usePayments({
    enabled: true,
    filters: {
      search: debouncedSearch || undefined,
      limit: 20,
      page,
      status: statusFilter === "all" ? undefined : statusFilter,
      gateway: gatewayFilter === "all" ? undefined : gatewayFilter,
    },
  });

  const { data: paymentDetail, isLoading: detailLoading } = usePaymentById(
    detailPaymentId,
    sheetOpen,
  );

  const payments = paymentsData?.data ?? [];
  const pagination = paymentsData?.pagination;
  const totalPages = pagination?.totalPages ?? 0;

  const openDetail = useCallback((paymentId: string) => {
    setDetailPaymentId(paymentId);
    setSheetOpen(true);
  }, []);

  const onExport = async () => {
    if (payments.length === 0) {
      toast.warning("No payment data available to export");
      return;
    }
    const { exportToCSV } = await import("@/lib/utils/export");
    exportToCSV(
      payments.map((p) => ({
        "Payment ID": p.paymentId,
        "Transaction ID": p.transactionId ?? "",
        Amount: `₹${parseFloat(String(p.amount)).toFixed(2)}`,
        Gateway: p.gateway,
        Status: p.status,
        Date: new Date(p.createdAt).toLocaleDateString(),
      })),
      "payments_export",
    );
    toast.success("Exported.");
  };

  return (
    <PageLayout
      subtitle="Console"
      header="Payments"
      description="Track platform revenue, transactions, and verification queue."
      actions={
        <Button variant="outline" onClick={onExport} className="gap-1.5">
          <Download className="size-3.5" />
          Export CSV
        </Button>
      }
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by payment / transaction id…"
        >
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={gatewayFilter}
            onValueChange={(v) => {
              setGatewayFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-[140px]">
              <SelectValue placeholder="Gateway" />
            </SelectTrigger>
            <SelectContent>
              {GATEWAY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageFilters>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={10} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Transactions appear here once learners purchase courses."
          icon={<CreditCard className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className={isFetching ? "opacity-50" : ""}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-border/70">
                    <TableHead className="font-display text-xs">
                      Payment
                    </TableHead>
                    <TableHead className="font-display text-xs">
                      Amount
                    </TableHead>
                    <TableHead className="hidden font-display text-xs sm:table-cell">
                      Gateway
                    </TableHead>
                    <TableHead className="font-display text-xs">
                      Status
                    </TableHead>
                    <TableHead className="hidden font-display text-xs md:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="text-right font-display text-xs">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow
                      key={payment.paymentId}
                      className="cursor-pointer border-b-border/60 transition-colors hover:bg-muted/40"
                      onClick={() => openDetail(payment.paymentId)}
                    >
                      <TableCell className="max-w-[180px] py-3">
                        <p className="truncate font-mono text-xs text-foreground">
                          {payment.paymentId.slice(0, 8)}…
                        </p>
                        {payment.transactionId && (
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            txn · {payment.transactionId}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-display text-base font-medium">
                        ₹{parseFloat(String(payment.amount)).toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {payment.gateway}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(payment.paymentId)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground">{pagination?.page}</span> of{" "}
                <span className="text-foreground">{totalPages}</span> ·{" "}
                {pagination?.total ?? 0} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination?.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={pagination?.page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <PaymentDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        payment={paymentDetail}
        isLoading={detailLoading}
      />
    </PageLayout>
  );
}
