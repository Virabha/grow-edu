"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePhonePeStatus } from "@/lib/hooks/use-payments";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");

  const { data, isLoading, isError } = usePhonePeStatus(paymentId);

  if (isLoading || (data && data.status === "PENDING")) {
    return (
      <Frame tone="amber" icon={<Loader2 className="size-7 animate-spin" />}>
        <Title accent="Verifying…">Verifying your payment</Title>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We&apos;re confirming the payment with PhonePe. This usually takes a
          few seconds — don&apos;t close the tab.
        </p>
      </Frame>
    );
  }

  if (!paymentId || isError) {
    return (
      <Frame tone="rose" icon={<AlertTriangle className="size-7" />}>
        <Title accent="Hiccup.">Couldn&apos;t verify</Title>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We couldn&apos;t look up your payment. If you were charged, check
          &quot;My courses&quot; in a minute — enrolment is usually granted by
          PhonePe&apos;s callback shortly after.
        </p>
        <Actions router={router} />
      </Frame>
    );
  }

  if (data?.status === "COMPLETED") {
    return (
      <Frame tone="emerald" icon={<CheckCircle2 className="size-7" />}>
        <Title accent="confirmed.">Payment</Title>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You&apos;re enrolled. Jump in and start learning.
        </p>
        <Actions router={router} />
      </Frame>
    );
  }

  if (data?.status === "FAILED") {
    return (
      <Frame tone="rose" icon={<AlertTriangle className="size-7" />}>
        <Title accent="failed.">Payment</Title>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The payment didn&apos;t go through. You haven&apos;t been charged
          — try again from the course page.
        </p>
        <Actions router={router} />
      </Frame>
    );
  }

  return (
    <Frame tone="amber" icon={<Clock className="size-7" />}>
      <Title accent="pending.">Payment</Title>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        The payment is being processed. We&apos;ll email you the moment
        it&apos;s confirmed.
      </p>
      <Actions router={router} />
    </Frame>
  );
}

function Frame({
  tone,
  icon,
  children,
}: {
  tone: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
        : "border-amber-500/30 bg-amber-500/10 text-amber-600";
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center sm:p-10"
      >
        <span
          className={`mx-auto flex size-16 items-center justify-center rounded-full border ${toneClass}`}
        >
          {icon}
        </span>
        {children}
      </motion.div>
    </div>
  );
}

function Title({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <h1 className="font-display mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
      {children} <em className="text-primary">{accent}</em>
    </h1>
  );
}

function Actions({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
      <Button
        variant="outline"
        onClick={() => router.push("/courses")}
        className="rounded-full"
      >
        Browse more
      </Button>
      <Button
        onClick={() => router.push("/my-courses")}
        className="rounded-full"
      >
        My courses
      </Button>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-9 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
