"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart } from "lucide-react";
import { usePayoutSales } from "@/features/payouts/hooks/use-payouts";

export default function InstructorSalesPage() {
  const [page, setPage] = useState(1);

  const {
    data: salesData,
    isLoading,
    error,
    refetch,
  } = usePayoutSales(page, 20);

  const sales = salesData?.data ?? [];
  const meta = salesData?.meta;

  function formatCurrency(amount: number, currency: string) {
    const symbol = currency === "INR" ? "₹" : "$";
    return `${symbol}${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <PageLayout
      subtitle="Studio"
      header="My Sales"
      description="Order history for all completed purchases of your courses."
    >
      <div className="space-y-6">
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">01</span>
            <span className="inline-block h-px w-8 bg-border" />
            Order History
          </header>

          <div className="rounded-2xl border border-border bg-card">
            {isLoading ? (
              <div className="space-y-2 p-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-destructive">
                  Failed to load sales data.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : sales.length === 0 ? (
              <EmptyState
                title="No sales yet"
                description="Completed course purchases will appear here once students enrol in your courses."
                icon={<ShoppingCart className="size-10" />}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Main Price</TableHead>
                    <TableHead>Your Commission</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale, idx) => (
                    <TableRow key={sale.paymentId}>
                      <TableCell className="text-muted-foreground">
                        {((page - 1) * 20) + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.courseTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sale.buyerName}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(sale.mainPrice, sale.currency)}
                      </TableCell>
                      <TableCell className="text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(sale.yourCommission, sale.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} &middot; {meta.total}{" "}
                  total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Commission note */}
          {sales.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Commission rate is not configured yet — amounts shown are gross
              revenue.
            </p>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
