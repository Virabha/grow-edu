"use client";
import Image from "next/image";
import { QrCode } from "lucide-react";
import type { QRPaymentSettings } from "@/lib/hooks/use-payments";
import { DetailRow } from "./copy-button";

interface PaymentPanelProps {
  qr: QRPaymentSettings;
  amount: number;
  currency: string;
}

export function PaymentPanel({ qr, amount, currency }: PaymentPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Step 01 · Pay
          </p>
          <p className="font-display break-words text-2xl font-medium leading-tight text-foreground">
            {currency} {amount.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row">
        {qr.qrImageUrl ? (
          <div className="relative aspect-square w-full max-w-[240px] shrink-0 overflow-hidden rounded-xl border border-border bg-white sm:size-52 md:size-56">
            <Image
              src={qr.qrImageUrl}
              alt="Payment QR code"
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 240px, 224px"
              unoptimized
            />
          </div>
        ) : (
          <div className="grid aspect-square w-full max-w-[240px] place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground sm:size-52 md:size-56">
            QR not configured
          </div>
        )}

        <div className="w-full min-w-0 space-y-1.5">
          {qr.upiId && (
            <DetailRow label="UPI ID" value={qr.upiId} mono copyable />
          )}
          {qr.bankAccountHolder && (
            <DetailRow label="Account holder" value={qr.bankAccountHolder} />
          )}
          {qr.bankName && <DetailRow label="Bank" value={qr.bankName} />}
          {qr.bankAccountNumber && (
            <DetailRow
              label="Account no."
              value={qr.bankAccountNumber}
              mono
              copyable
            />
          )}
          {qr.bankIfsc && (
            <DetailRow label="IFSC" value={qr.bankIfsc} mono copyable />
          )}
        </div>
      </div>

      {qr.instructions && (
        <div className="mt-5 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {qr.instructions}
        </div>
      )}
    </div>
  );
}
