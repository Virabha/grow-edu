"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { StatusPill } from "@/components/admin/status-pill";
import { apiClient } from "@/lib/api/client";
import { useCreateResource, useResourceList } from "@/lib/hooks/use-resource";
import { getApiError } from "@/lib/api/errors";
import { formatDate, formatMoney } from "@/lib/format";

interface InstructorDashboard {
  stats: { pendingPayout: number; lifetimeEarnings: number; currency: string };
}

export default function InstructorPayoutsPage() {
  const [open, setOpen] = React.useState(false);
  const [methodId, setMethodId] = React.useState("");
  const [amount, setAmount] = React.useState("");

  const dashboard = useQuery({
    queryKey: ["instructor/dashboard"],
    queryFn: () =>
      apiClient.get<InstructorDashboard>("/instructor/dashboard").then((r) => r.data),
  });
  const methods = useResourceList("withdraw-methods", { isActive: "true", limit: 20 });
  const requests = useResourceList("payouts", { limit: 25 });
  const create = useCreateResource("payouts");

  const available = dashboard.data?.stats.pendingPayout ?? 0;
  const methodRows = (methods.data?.data ?? []).filter((m) => m.isActive !== false);
  const chosen = methodRows.find((m) => String(m.id) === methodId);
  const rows = requests.data?.data ?? [];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);

    if (!methodId) {
      toast.error("Choose how you want to be paid.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter the amount you want to withdraw.");
      return;
    }
    if (value > available) {
      toast.error(
        `You can withdraw up to ${formatMoney(available)} right now.`,
      );
      return;
    }
    const min = Number(chosen?.minAmount ?? 0);
    if (min > 0 && value < min) {
      toast.error(`${String(chosen?.name)} has a ${formatMoney(min)} minimum.`);
      return;
    }

    const feePercent = Number(chosen?.feePercent ?? 0);
    const fee = Math.round((value * feePercent) / 100);

    create.mutate(
      {
        instructorId: "ins-anand",
        instructorName: "Anand Krishnan",
        methodId,
        methodName: String(chosen?.name ?? ""),
        amount: value,
        fee,
        netAmount: value - fee,
        status: "PENDING",
        requestedAt: new Date().toISOString(),
        processedAt: null,
        note: null,
        reference: null,
      },
      {
        onSuccess: () => {
          toast.success("Payout requested. Finance reviews these within 3 days.");
          setOpen(false);
          setAmount("");
        },
        onError: (err) =>
          toast.error(getApiError(err, "Could not request").message),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Earnings"
      header="Request payout"
      description="Withdraw earnings that have cleared the refund hold period."
      actions={
        <Button size="sm" onClick={() => setOpen(true)} disabled={available <= 0}>
          <Wallet className="mr-1.5 h-4 w-4" />
          Request payout
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Available now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {dashboard.isLoading ? "—" : formatMoney(available)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Past the 14-day refund window
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Lifetime earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {dashboard.isLoading
                  ? "—"
                  : formatMoney(dashboard.data?.stats.lifetimeEarnings ?? 0)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                After the platform share
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                In review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(
                  rows
                    .filter((r) => r.status === "PENDING")
                    .reduce((s, r) => s + Number(r.netAmount ?? 0), 0),
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {rows.filter((r) => r.status === "PENDING").length} request(s)
                awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payout history</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                title="No payouts yet"
                description="Your first withdrawal will show up here."
                className="py-8"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={String(row.id)}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(String(row.requestedAt ?? ""))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {String(row.methodName ?? "")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(Number(row.amount ?? 0))}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(Number(row.netAmount ?? 0))}
                        </TableCell>
                        <TableCell>
                          <StatusPill value={String(row.status ?? "")} />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {row.reference
                            ? String(row.reference)
                            : row.note
                              ? String(row.note)
                              : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="Request a payout"
        description={`${formatMoney(available)} is available to withdraw.`}
        onSubmit={submit}
        submitLabel="Send request"
        submitting={create.isPending}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payout-method">Pay me by</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger id="payout-method">
                <SelectValue placeholder="Choose a method" />
              </SelectTrigger>
              <SelectContent>
                {methodRows.map((method) => (
                  <SelectItem key={String(method.id)} value={String(method.id)}>
                    {String(method.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chosen && (
              <p className="text-xs text-muted-foreground">
                Minimum {formatMoney(Number(chosen.minAmount ?? 0))} ·{" "}
                {Number(chosen.processingDays ?? 0)} working days
                {Number(chosen.feePercent ?? 0) > 0 &&
                  ` · ${Number(chosen.feePercent)}% fee`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-amount">Amount</Label>
            <Input
              id="payout-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(available)}
            />
            <button
              type="button"
              className="text-xs text-primary underline-offset-4 hover:underline"
              onClick={() => setAmount(String(available))}
            >
              Withdraw the full {formatMoney(available)}
            </button>
          </div>
        </div>
      </FormSheet>
    </PageLayout>
  );
}
