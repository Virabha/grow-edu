"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/layout/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { IndianRupee, BookOpen, Wallet, Trash2 } from "lucide-react";
import {
  useCancelPayout,
  useCreatePayout,
  usePayoutEarnings,
  usePayoutHistory,
} from "@/features/payouts/hooks/use-payouts";
import type { PayoutStatus } from "@/features/payouts/types";

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  PayoutStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className:
      "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  },
  APPROVED: {
    label: "Approved",
    className:
      "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-destructive/30 bg-destructive/5 text-destructive",
  },
  PAID: {
    label: "Paid",
    className:
      "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  },
};

function StatusBadge({ status }: { status: PayoutStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

// ── request payout form ───────────────────────────────────────────────────────

function RequestPayoutDialog({
  availableBalance,
  onSuccess,
}: {
  availableBalance: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createPayout = useCreatePayout();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (parsedAmount > availableBalance) {
      setError(
        `Amount cannot exceed your balance of ₹${availableBalance.toFixed(2)}.`,
      );
      return;
    }
    if (!method.trim()) {
      setError("Please enter a payout method.");
      return;
    }

    try {
      await createPayout.mutateAsync({
        amount: parsedAmount,
        method: method.trim(),
        accountDetails: accountDetails.trim() || undefined,
      });
      setOpen(false);
      setAmount("");
      setMethod("");
      setAccountDetails("");
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit payout request.";
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Wallet className="size-3.5" />
          Request Payout
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Available balance
            </p>
            <p className="font-display text-2xl font-medium text-foreground">
              ₹{availableBalance.toFixed(2)}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="payout-amount"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Withdraw Amount
              </label>
              <Input
                id="payout-amount"
                type="number"
                min="1"
                max={availableBalance}
                step="0.01"
                placeholder="e.g. 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="payout-method"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Payout Method
              </label>
              <Input
                id="payout-method"
                type="text"
                placeholder="e.g. PayPal, Bank Transfer"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="payout-account"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Account Details{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="payout-account"
                type="text"
                placeholder="e.g. paypal@example.com"
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createPayout.isPending}
            >
              {createPayout.isPending ? "Submitting…" : "Request Payout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function InstructorPayoutsPage() {
  const [page, setPage] = useState(1);
  const cancelPayout = useCancelPayout();

  const { data: earnings, isLoading: earningsLoading } = usePayoutEarnings();
  const {
    data: history,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = usePayoutHistory(page, 20);

  const payouts = history?.data ?? [];
  const meta = history?.meta;

  const balance = earnings?.currentBalance ?? 0;

  function formatCurrency(n: number) {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <PageLayout
      subtitle="Studio"
      header="Request Payout"
      description="Track your earnings and manage withdrawal requests."
      actions={
        earningsLoading ? (
          <Skeleton className="h-8 w-36 rounded-md" />
        ) : (
          <RequestPayoutDialog
            availableBalance={balance}
            onSuccess={() => void refetchHistory()}
          />
        )
      }
    >
      <div className="space-y-6">
        {/* ── Earnings summary ────────────────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">01</span>
            <span className="inline-block h-px w-8 bg-border" />
            Earnings
          </header>

          {earningsLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard
                title="Current Balance"
                description="Available to withdraw"
                value={formatCurrency(earnings?.currentBalance ?? 0)}
                icon={IndianRupee}
              />
              <StatCard
                title="Courses Sold"
                description="Completed purchases"
                value={String(earnings?.coursesSold ?? 0)}
                icon={BookOpen}
              />
              <StatCard
                title="Total Payout"
                description="Disbursed to date"
                value={formatCurrency(earnings?.totalPayout ?? 0)}
                icon={Wallet}
              />
            </div>
          )}
        </section>

        {/* ── Payout history table ─────────────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">02</span>
            <span className="inline-block h-px w-8 bg-border" />
            Payout History
          </header>

          <div className="rounded-2xl border border-border bg-card">
            {historyLoading ? (
              <div className="space-y-2 p-5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : historyError ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-destructive">
                  Failed to load payout history.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refetchHistory()}
                >
                  Retry
                </Button>
              </div>
            ) : payouts.length === 0 ? (
              <EmptyState
                title="No payout requests yet"
                description="Once you request a payout it will appear here."
                icon={<Wallet className="size-10" />}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Withdraw Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout, idx) => (
                    <TableRow key={payout.payoutId}>
                      <TableCell className="text-muted-foreground">
                        {((page - 1) * 20) + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{parseFloat(payout.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{payout.method}</TableCell>
                      <TableCell>
                        <StatusBadge status={payout.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(payout.requestedAt).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </TableCell>
                      <TableCell>
                        {payout.status === "PENDING" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                disabled={cancelPayout.isPending}
                                aria-label="Cancel payout request"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Cancel this payout request?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  The ₹
                                  {parseFloat(payout.amount).toFixed(2)}{" "}
                                  request will be removed and the amount
                                  returned to your available balance.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep it</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    cancelPayout.mutate(payout.payoutId)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Yes, cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
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
        </section>

        {/* Admin note */}
        {payouts.some((p) => p.adminNote) && (
          <section className="space-y-2">
            <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-sm italic text-primary">
                03
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              Admin notes
            </header>
            {payouts
              .filter((p) => p.adminNote)
              .map((p) => (
                <div
                  key={p.payoutId}
                  className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
                >
                  <span className="font-semibold text-foreground">
                    {p.method}
                  </span>{" "}
                  · <StatusBadge status={p.status} /> — {p.adminNote}
                </div>
              ))}
          </section>
        )}
      </div>
    </PageLayout>
  );
}
