"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getApiError } from "@/lib/api/errors";

import { PageLayout } from "@/components/layout/page-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useQRSettings,
  useUpdateQRSettings,
} from "@/features/payments/hooks/use-payments";
import { uploadFile } from "@/lib/api/upload";

// ── Zod schema ─────────────────────────────────────────────────────────
// Individual fields are optional, but the form requires at least one mode of
// payment (QR image, UPI, or a *complete* bank section) so admins don't ship
// a blank checkout to learners.
const isUrl = (v: string) => /^https?:\/\//.test(v);

const qrSettingsSchema = z
  .object({
    qrImageUrl: z
      .string()
      .trim()
      .max(2048)
      .optional()
      .refine((v) => !v || isUrl(v), {
        message: "QR image must be uploaded (no manual URL).",
      }),
    upiId: z
      .string()
      .trim()
      .max(120)
      .optional()
      .refine(
        (v) => !v || /^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{2,}$/.test(v),
        { message: "Use a valid UPI ID like name@bank." },
      ),
    bankName: z.string().trim().max(120).optional(),
    bankAccountNumber: z
      .string()
      .trim()
      .max(40)
      .optional()
      .refine(
        (v) => !v || /^[0-9]{6,20}$/.test(v),
        { message: "Account number should be 6–20 digits." },
      ),
    bankIfsc: z
      .string()
      .trim()
      .max(20)
      .optional()
      .refine(
        (v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()),
        { message: "Invalid IFSC (format: AAAA0XXXXXX)." },
      ),
    bankAccountHolder: z.string().trim().max(120).optional(),
    instructions: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const hasQr = !!data.qrImageUrl;
    const hasUpi = !!data.upiId;
    const bankPairs: { key: keyof typeof data; label: string }[] = [
      { key: "bankAccountHolder", label: "Account holder" },
      { key: "bankName", label: "Bank name" },
      { key: "bankAccountNumber", label: "Account number" },
      { key: "bankIfsc", label: "IFSC" },
    ];
    const filled = bankPairs.filter((b) => !!data[b.key]).length;
    const hasCompleteBank = filled === 4;
    const hasPartialBank = filled > 0 && filled < 4;

    if (!hasQr && !hasUpi && !hasCompleteBank) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qrImageUrl"],
        message:
          "Configure at least one — QR image, UPI ID, or all four bank fields.",
      });
    }
    if (hasPartialBank) {
      bankPairs
        .filter((b) => !data[b.key])
        .forEach((b) =>
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [b.key as string],
            message: `${b.label} is required when other bank fields are set.`,
          }),
        );
    }
  });

type QRSettingsForm = z.infer<typeof qrSettingsSchema>;

const EMPTY_FORM: QRSettingsForm = {
  qrImageUrl: "",
  upiId: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankAccountHolder: "",
  instructions: "",
};

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
    >
      {children}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export default function PaymentSettingsPage() {
  const { data, isLoading } = useQRSettings();
  const update = useUpdateQRSettings();
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<QRSettingsForm>({
    resolver: zodResolver(qrSettingsSchema),
    defaultValues: EMPTY_FORM,
    mode: "onBlur",
  });

  const qrImageUrl = watch("qrImageUrl") ?? "";

  useEffect(() => {
    if (!data) return;
    reset({
      qrImageUrl: data.qrImageUrl ?? "",
      upiId: data.upiId ?? "",
      bankName: data.bankName ?? "",
      bankAccountNumber: data.bankAccountNumber ?? "",
      bankIfsc: data.bankIfsc ?? "",
      bankAccountHolder: data.bankAccountHolder ?? "",
      instructions: data.instructions ?? "",
    });
  }, [data, reset]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, "qr");
      setValue("qrImageUrl", url, {
        shouldValidate: true,
        shouldDirty: true,
      });
      toast.success("QR uploaded.");
    } catch (err) {
      toast.error(getApiError(err, "Upload failed.").message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: QRSettingsForm) => {
    try {
      await update.mutateAsync({
        qrImageUrl: values.qrImageUrl || null,
        upiId: values.upiId || null,
        bankName: values.bankName || null,
        bankAccountNumber: values.bankAccountNumber || null,
        bankIfsc: values.bankIfsc?.toUpperCase() || null,
        bankAccountHolder: values.bankAccountHolder || null,
        instructions: values.instructions || null,
      });
      toast.success("Payment settings saved.");
      reset(values);
    } catch (err) {
      toast.error(getApiError(err, "Save failed.").message);
    }
  };

  return (
    <PageLayout
      subtitle="Console"
      header="Payment settings"
      description="Configure the QR code, UPI ID, and bank details learners see at checkout."
    >
      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 lg:grid-cols-2"
          noValidate
        >
          {/* ── QR + UPI ──────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              QR & UPI
            </p>
            <p className="font-display mt-1 text-xl font-medium text-foreground">
              Direct payment.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The QR image learners scan plus your UPI handle as a fallback.
            </p>

            <div className="mt-5 flex flex-col items-start gap-3">
              {qrImageUrl ? (
                <div className="relative size-56 overflow-hidden rounded-xl border border-border bg-white">
                  <Image
                    src={qrImageUrl}
                    alt="QR code"
                    fill
                    className="object-contain p-2"
                    sizes="224px"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="grid size-56 place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  No QR uploaded
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="qr-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? "Uploading…" : "Upload QR"}
                  <input
                    id="qr-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </Label>
                {qrImageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setValue("qrImageUrl", "", {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
              <FieldError message={errors.qrImageUrl?.message} />
            </div>

            <div className="mt-5 space-y-1.5">
              <FieldLabel htmlFor="upi">UPI ID</FieldLabel>
              <Controller
                control={control}
                name="upiId"
                render={({ field }) => (
                  <Input
                    id="upi"
                    {...field}
                    value={field.value ?? ""}
                    placeholder="yourname@bank"
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
              />
              <FieldError message={errors.upiId?.message} />
            </div>
          </section>

          {/* ── Bank details ──────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bank
            </p>
            <p className="font-display mt-1 text-xl font-medium text-foreground">
              Bank transfer details.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill all four fields if you want to offer bank transfer.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="holder">Account holder</FieldLabel>
                <Controller
                  control={control}
                  name="bankAccountHolder"
                  render={({ field }) => (
                    <Input
                      id="holder"
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Name as on the bank account"
                    />
                  )}
                />
                <FieldError message={errors.bankAccountHolder?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="bank-name">Bank name</FieldLabel>
                <Controller
                  control={control}
                  name="bankName"
                  render={({ field }) => (
                    <Input
                      id="bank-name"
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. HDFC Bank"
                    />
                  )}
                />
                <FieldError message={errors.bankName?.message} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="acct">Account number</FieldLabel>
                  <Controller
                    control={control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <Input
                        id="acct"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="6–20 digits"
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    )}
                  />
                  <FieldError message={errors.bankAccountNumber?.message} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="ifsc">IFSC</FieldLabel>
                  <Controller
                    control={control}
                    name="bankIfsc"
                    render={({ field }) => (
                      <Input
                        id="ifsc"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="AAAA0XXXXXX"
                        className="uppercase"
                        spellCheck={false}
                      />
                    )}
                  />
                  <FieldError message={errors.bankIfsc?.message} />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="instructions">
                  Instructions to learner
                </FieldLabel>
                <Controller
                  control={control}
                  name="instructions"
                  render={({ field }) => (
                    <Textarea
                      id="instructions"
                      {...field}
                      value={field.value ?? ""}
                      rows={4}
                      placeholder="Pay the exact amount, then upload a screenshot of the transaction."
                    />
                  )}
                />
                <FieldError message={errors.instructions?.message} />
              </div>
            </div>
          </section>

          <div className="flex justify-end lg:col-span-2">
            <Button
              type="submit"
              disabled={!isDirty || isSubmitting || update.isPending}
              className="gap-1.5"
            >
              {(isSubmitting || update.isPending) && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      )}
    </PageLayout>
  );
}
