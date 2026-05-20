"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Clock, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/api/upload";
import {
  useUploadProof,
  type CreateManualQRResponse,
} from "@/lib/hooks/use-payments";
import { getApiErrorMessage } from "@/lib/utils";

interface ProofPanelProps {
  pending: CreateManualQRResponse;
  isAlreadySubmitted: boolean;
  onSubmitted: () => void;
}

export function ProofPanel({
  pending,
  isAlreadySubmitted,
  onSubmitted,
}: ProofPanelProps) {
  const uploadProof = useUploadProof();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const handleFile = (file: File | null) => {
    setProofFile(file);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(file ? URL.createObjectURL(file) : null);
  };

  const canSubmit =
    !!proofFile && transactionId.trim().length >= 4 && !uploading;

  const handleSubmit = async () => {
    if (!proofFile) {
      toast.error("Attach your transaction screenshot first.");
      return;
    }
    if (transactionId.trim().length < 4) {
      toast.error("Enter your transaction ID (min. 4 characters).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(proofFile, "payment-proofs");
      await uploadProof.mutateAsync({
        paymentId: pending.paymentId,
        proofUrl: url,
        transactionId: transactionId.trim(),
        payerName: payerName.trim() || undefined,
      });
      toast.success("Proof submitted — awaiting admin review.");
      onSubmitted();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Step 02 · Verify
          </p>
          <p className="font-display text-xl font-medium leading-tight text-foreground sm:text-2xl">
            Submit your proof.
          </p>
        </div>
      </div>

      {isAlreadySubmitted ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <p>
            We already received your proof. The admin is reviewing — we&apos;ll
            email you the moment it&apos;s confirmed.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_minmax(0,220px)] lg:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="txn-id"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Transaction ID / UTR{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="txn-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 458912703456"
                autoComplete="off"
                inputMode="text"
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Find this on your bank or UPI app after a successful payment.
                We use it to match your transfer.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="payer-name"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Payer name (optional)
              </Label>
              <Input
                id="payer-name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Name shown on the receipt"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor="proof-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Upload className="size-4" />
                {proofFile ? "Change screenshot" : "Attach screenshot"}
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </Label>
              {proofFile && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFile(null)}
                  className="gap-1"
                >
                  <X className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>

            <Button
              type="button"
              className="h-11 w-full gap-2 rounded-full bg-foreground font-medium text-background hover:bg-foreground/90"
              disabled={!canSubmit || uploadProof.isPending}
              onClick={handleSubmit}
            >
              {uploading || uploadProof.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit for review"
              )}
            </Button>
          </div>

          <div>
            {proofPreview ? (
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-background">
                <Image
                  src={proofPreview}
                  alt="Payment proof preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-center text-xs text-muted-foreground">
                Screenshot preview
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
