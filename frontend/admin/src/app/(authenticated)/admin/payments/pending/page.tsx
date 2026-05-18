"use client";
import { useState } from "react";
import Image from "next/image";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
    usePendingPayments,
    useApprovePayment,
    useRejectPayment,
} from "@/features/payments/hooks/use-payments";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import type { Payment } from "@/features/payments/api/payments.api";

export default function PendingPaymentsPage() {
    const { data, isLoading } = usePendingPayments(1, 50);
    const approve = useApprovePayment();
    const reject = useRejectPayment();
    const [reviewing, setReviewing] = useState<Payment | null>(null);
    const [action, setAction] = useState<"approve" | "reject" | null>(null);
    const [notes, setNotes] = useState("");

    const handleSubmit = async () => {
        if (!reviewing || !action) return;
        if (action === "reject" && !notes.trim()) {
            toast.error("Rejection notes are required");
            return;
        }
        try {
            if (action === "approve") {
                await approve.mutateAsync({ paymentId: reviewing.paymentId, notes: notes || undefined });
                toast.success("Payment approved");
            } else {
                await reject.mutateAsync({ paymentId: reviewing.paymentId, notes });
                toast.success("Payment rejected");
            }
            setReviewing(null);
            setAction(null);
            setNotes("");
        } catch (e: any) {
            toast.error(e?.message || "Action failed");
        }
    };

    const rows = data?.data ?? [];

    return (
        <PageLayout
            header="Pending Payment Reviews"
            description="Manual QR payments awaiting your approval. Verify the proof against your records before approving."
        >
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Nothing to review"
                    description="No pending QR payments awaiting approval."
                />
            ) : (
                <div className="space-y-3">
                    {rows.map((p: any) => (
                        <Card key={p.paymentId}>
                            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                                <div>
                                    <CardTitle className="text-base">
                                        {p.course?.title || p.section?.title || "Course"}
                                    </CardTitle>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {p.user?.firstName} {p.user?.lastName} &middot; {p.user?.email}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Proof uploaded {p.proofUploadedAt ? new Date(p.proofUploadedAt).toLocaleString() : "—"}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="secondary">PROOF UPLOADED</Badge>
                                    <div className="mt-2 text-base font-semibold">
                                        {p.currency} {Number(p.amount).toFixed(2)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    {p.paymentProofUrl ? (
                                        <a href={p.paymentProofUrl} target="_blank" rel="noreferrer">
                                            <div className="relative h-24 w-24 overflow-hidden rounded border">
                                                <Image
                                                    src={p.paymentProofUrl}
                                                    alt="Payment proof"
                                                    fill
                                                    className="object-cover"
                                                    sizes="96px"
                                                    unoptimized
                                                />
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="h-24 w-24 grid place-items-center rounded border bg-muted text-xs text-muted-foreground">
                                            no image
                                        </div>
                                    )}
                                    {p.paymentProofUrl && (
                                        <a
                                            href={p.paymentProofUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                            Open full size <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setReviewing(p);
                                            setAction("reject");
                                            setNotes("");
                                        }}
                                    >
                                        <XCircle className="mr-1 h-4 w-4" /> Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setReviewing(p);
                                            setAction("approve");
                                            setNotes("");
                                        }}
                                    >
                                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog
                open={!!reviewing}
                onOpenChange={(o) => {
                    if (!o) {
                        setReviewing(null);
                        setAction(null);
                        setNotes("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === "approve" ? "Approve payment" : "Reject payment"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Notes {action === "reject" && <span className="text-destructive">*</span>}</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={
                                action === "approve"
                                    ? "Optional notes for the record"
                                    : "Reason for rejection (shown to learner)"
                            }
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setReviewing(null);
                                setAction(null);
                                setNotes("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={approve.isPending || reject.isPending}
                            variant={action === "reject" ? "destructive" : "default"}
                        >
                            {action === "approve" ? "Approve" : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageLayout>
    );
}
