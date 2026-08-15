"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useResourceAction,
  useResourceList,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { getApiError } from "@/lib/api/errors";
import { formatDate, formatMoney } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function PayoutsPage() {
  const [status, setStatus] = React.useState("all");
  const [approving, setApproving] = React.useState<ResourceRow | null>(null);
  const [rejecting, setRejecting] = React.useState<ResourceRow | null>(null);
  const [reference, setReference] = React.useState("");
  const [note, setNote] = React.useState("");

  const { data, isLoading, isError, error, refetch } = useResourceList("payouts", {
    status,
    limit: 25,
  });
  const approve = useResourceAction("payouts", "approve");
  const reject = useResourceAction("payouts", "reject");

  const rows = data?.data ?? [];
  const pending = rows.filter((r) => r.status === "PENDING");
  const pendingTotal = pending.reduce((s, r) => s + Number(r.netAmount ?? 0), 0);

  function submitApprove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!approving) return;
    approve.mutate(
      { id: String(approving.id), body: { reference: reference.trim() } },
      {
        onSuccess: () => {
          toast.success("Payout approved");
          setApproving(null);
          setReference("");
        },
        onError: (err) =>
          toast.error(getApiError(err, "Could not approve").message),
      },
    );
  }

  function submitReject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejecting) return;
    if (note.trim().length < 10) {
      toast.error("Give the instructor a reason — at least 10 characters.");
      return;
    }
    reject.mutate(
      { id: String(rejecting.id), body: { note: note.trim() } },
      {
        onSuccess: () => {
          toast.success("Payout rejected");
          setRejecting(null);
          setNote("");
        },
        onError: (err) =>
          toast.error(getApiError(err, "Could not reject").message),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Payouts"
      header="Payout requests"
      description="Instructor withdrawals waiting on approval, and everything already processed."
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value)}
          >
            <SelectTrigger className="h-9 w-[190px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pending.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {pending.length} pending
              </span>{" "}
              · {formatMoney(pendingTotal)} to release
            </p>
          )}
        </div>
      }
    >
      {isError ? (
        <EmptyState
          title="We could not load payout requests"
          description={getApiError(error, "Please try again.").message}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payout requests"
          description="Requests appear here as soon as an instructor asks to withdraw."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instructor</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell className="font-medium">
                    {String(row.instructorName ?? "")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {String(row.methodName ?? "")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(Number(row.amount ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {Number(row.fee ?? 0) > 0
                      ? formatMoney(Number(row.fee))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(Number(row.netAmount ?? 0))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(String(row.requestedAt ?? ""))}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={String(row.status ?? "")} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {row.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setApproving(row);
                            setReference("");
                          }}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            setRejecting(row);
                            setNote("");
                          }}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {row.reference
                          ? String(row.reference)
                          : row.note
                            ? "Reason recorded"
                            : "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FormSheet
        open={!!approving}
        onOpenChange={(open) => !open && setApproving(null)}
        title="Approve this payout"
        description={
          approving
            ? `${formatMoney(Number(approving.netAmount ?? 0))} to ${String(approving.instructorName)} via ${String(approving.methodName)}.`
            : ""
        }
        onSubmit={submitApprove}
        submitLabel="Approve payout"
        submitting={approve.isPending}
        size="sm"
      >
        <div className="space-y-1.5">
          <Label htmlFor="payout-reference">Payment reference</Label>
          <Input
            id="payout-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="UTR or transaction id"
          />
          <p className="text-xs text-muted-foreground">
            Shown to the instructor so they can match it against their bank statement.
          </p>
        </div>
      </FormSheet>

      <FormSheet
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        title="Reject this payout"
        description={
          rejecting
            ? `${formatMoney(Number(rejecting.netAmount ?? 0))} to ${String(rejecting.instructorName)}.`
            : ""
        }
        onSubmit={submitReject}
        submitLabel="Reject request"
        submitting={reject.isPending}
        size="sm"
      >
        <div className="space-y-1.5">
          <Label htmlFor="payout-note">Reason</Label>
          <Textarea
            id="payout-note"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain what needs to change before they resubmit."
          />
        </div>
      </FormSheet>
    </PageLayout>
  );
}
