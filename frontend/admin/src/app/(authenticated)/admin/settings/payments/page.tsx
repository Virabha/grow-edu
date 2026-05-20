"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

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

interface QRForm {
  qrImageUrl: string;
  upiId: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountHolder: string;
  instructions: string;
}

const EMPTY_FORM: QRForm = {
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

export default function PaymentSettingsPage() {
  const { data, isLoading } = useQRSettings();
  const update = useUpdateQRSettings();
  const [form, setForm] = useState<QRForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      qrImageUrl: data.qrImageUrl ?? "",
      upiId: data.upiId ?? "",
      bankName: data.bankName ?? "",
      bankAccountNumber: data.bankAccountNumber ?? "",
      bankIfsc: data.bankIfsc ?? "",
      bankAccountHolder: data.bankAccountHolder ?? "",
      instructions: data.instructions ?? "",
    });
  }, [data]);

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
      setForm((s) => ({ ...s, qrImageUrl: url }));
      toast.success("QR uploaded.");
    } catch (err) {
      toast.error((err as Error)?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync(form);
      toast.success("Payment settings saved.");
    } catch (err) {
      toast.error((err as Error)?.message || "Save failed.");
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
        <div className="grid gap-4 lg:grid-cols-2">
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
              {form.qrImageUrl ? (
                <div className="relative size-56 overflow-hidden rounded-xl border border-border bg-white">
                  <Image
                    src={form.qrImageUrl}
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
                {form.qrImageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm((s) => ({ ...s, qrImageUrl: "" }))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <FieldLabel htmlFor="upi">UPI ID</FieldLabel>
              <Input
                id="upi"
                value={form.upiId}
                onChange={(e) =>
                  setForm((s) => ({ ...s, upiId: e.target.value }))
                }
                placeholder="yourname@bank"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bank
            </p>
            <p className="font-display mt-1 text-xl font-medium text-foreground">
              Bank transfer details.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown alongside the QR as a fallback option.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="holder">Account holder</FieldLabel>
                <Input
                  id="holder"
                  value={form.bankAccountHolder}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      bankAccountHolder: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="bank-name">Bank name</FieldLabel>
                <Input
                  id="bank-name"
                  value={form.bankName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, bankName: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="acct">Account number</FieldLabel>
                  <Input
                    id="acct"
                    value={form.bankAccountNumber}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        bankAccountNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="ifsc">IFSC</FieldLabel>
                  <Input
                    id="ifsc"
                    value={form.bankIfsc}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, bankIfsc: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="instructions">
                  Instructions to learner
                </FieldLabel>
                <Textarea
                  id="instructions"
                  rows={4}
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, instructions: e.target.value }))
                  }
                  placeholder="Pay the exact amount, then upload a screenshot of the transaction."
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end lg:col-span-2">
            <Button
              onClick={handleSave}
              disabled={update.isPending}
              className="gap-1.5"
            >
              {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
