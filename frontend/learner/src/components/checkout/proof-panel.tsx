"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Clock, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/api/upload";
import {
  useUploadProof,
  type CreateManualQRResponse,
} from "@/lib/hooks/use-payments";
import { cn } from "@/lib/utils";
import { getApiError } from "@/lib/api/errors";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const proofSchema = z.object({
  transactionId: z
    .string()
    .trim()
    .min(1, "Transaction ID is required.")
    .min(4, "Transaction ID must be at least 4 characters.")
    .max(64, "Transaction ID must be 64 characters or less.")
    .regex(
      /^[A-Za-z0-9\-_]+$/,
      "Only letters, numbers, hyphens, and underscores are allowed.",
    ),
  payerName: z
    .string()
    .trim()
    .max(120, "Payer name must be 120 characters or less.")
    .optional()
    .or(z.literal("")),
});

type ProofFormValues = z.infer<typeof proofSchema>;

interface ProofPanelProps {
  pending: CreateManualQRResponse;
  isAlreadySubmitted: boolean;
  onSubmitted: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive">{message}</p>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProofPanel({
  pending,
  isAlreadySubmitted,
  onSubmitted,
}: ProofPanelProps) {
  const uploadProof = useUploadProof();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<ProofFormValues>({
    resolver: zodResolver(proofSchema),
    mode: "onChange",
    defaultValues: { transactionId: "", payerName: "" },
  });

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const handleFile = (file: File | null) => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);

    if (!file) {
      setProofFile(null);
      setProofPreview(null);
      setFileError(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setProofFile(null);
      setProofPreview(null);
      setFileError("Upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setProofFile(null);
      setProofPreview(null);
      setFileError("Image must be 5 MB or smaller.");
      return;
    }

    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setFileError(null);
  };

  const onSubmit = async (values: ProofFormValues) => {
    if (!proofFile) {
      setFileError("Attach your transaction screenshot first.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(proofFile, "payment-proofs");
      await uploadProof.mutateAsync({
        paymentId: pending.paymentId,
        proofUrl: url,
        transactionId: values.transactionId.trim(),
        payerName: values.payerName?.trim() || undefined,
      });
      toast.success("Proof submitted — awaiting admin review.");
      onSubmitted();
    } catch (err) {
      const apiError = getApiError(err, "Upload failed.");
      toast.error(apiError.message);
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        setError(field as FieldPath<ProofFormValues>, { message });
      }
    } finally {
      setUploading(false);
    }
  };

  const isBusy = uploading || uploadProof.isPending;
  const submitDisabled = !isValid || !proofFile || !!fileError || isBusy;

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
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-5 grid gap-5 sm:grid-cols-[1fr_minmax(0,220px)] lg:grid-cols-[1fr_240px]"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="txn-id"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Transaction ID / UTR{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="transactionId"
                render={({ field }) => (
                  <Input
                    {...field}
                    id="txn-id"
                    placeholder="e.g. 458912703456"
                    autoComplete="off"
                    inputMode="text"
                    spellCheck={false}
                    aria-invalid={!!errors.transactionId}
                    className={cn(
                      "font-mono",
                      errors.transactionId &&
                        "border-destructive focus-visible:ring-destructive/30",
                    )}
                  />
                )}
              />
              <FieldError message={errors.transactionId?.message} />
              {!errors.transactionId && (
                <p className="text-[11px] text-muted-foreground">
                  Find this on your bank or UPI app after a successful payment.
                  We use it to match your transfer.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="payer-name"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Payer name (optional)
              </Label>
              <Controller
                control={control}
                name="payerName"
                render={({ field }) => (
                  <Input
                    {...field}
                    id="payer-name"
                    placeholder="Name shown on the receipt"
                    aria-invalid={!!errors.payerName}
                    className={cn(
                      errors.payerName &&
                        "border-destructive focus-visible:ring-destructive/30",
                    )}
                  />
                )}
              />
              <FieldError message={errors.payerName?.message} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Label
                  htmlFor="proof-upload"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
                    fileError ? "border-destructive" : "border-border",
                  )}
                >
                  <Upload className="size-4" />
                  {proofFile ? "Change screenshot" : "Attach screenshot"}
                  <input
                    id="proof-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
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
              {proofFile && !fileError && (
                <p className="text-[11px] text-muted-foreground break-all">
                  {proofFile.name} · {formatBytes(proofFile.size)}
                </p>
              )}
              <FieldError message={fileError ?? undefined} />
              {!proofFile && !fileError && (
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG, or WEBP up to 5 MB.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full gap-2 rounded-full bg-foreground font-medium text-background hover:bg-foreground/90"
              disabled={submitDisabled}
            >
              {isBusy ? (
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
        </form>
      )}
    </div>
  );
}
