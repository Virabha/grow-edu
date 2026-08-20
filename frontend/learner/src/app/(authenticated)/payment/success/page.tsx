"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyPayment } from "@/lib/hooks/use-payments";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");

  const { data: payment, isLoading } = useMyPayment(paymentId);

  if (isLoading) {
    return <PageLoader />;
  }

  const status = payment?.status;
  const isCompleted = status === "COMPLETED";
  const isPending = status === "PROOF_UPLOADED" || status === "PENDING";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center sm:p-10"
      >
        <span
          className={
            isCompleted
              ? "mx-auto flex size-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : isPending
                ? "mx-auto flex size-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600"
                : "mx-auto flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"
          }
        >
          {isPending ? (
            <Clock className="size-7" />
          ) : (
            <CheckCircle2 className="size-7" />
          )}
        </span>

        <h1 className="font-display mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          {isCompleted ? (
            <>
              Payment <em className="text-primary">verified.</em>
            </>
          ) : isPending ? (
            <>
              Awaiting <em className="text-primary">verification.</em>
            </>
          ) : (
            <>
              Thank <em className="text-primary">you.</em>
            </>
          )}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isCompleted
            ? "You're enrolled. Jump in and start learning."
            : isPending
              ? "Your proof is in the queue. We'll email you as soon as it's verified."
              : "Your payment was recorded."}
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => router.push("/batches")}
            className="rounded-full"
          >
            Browse more
          </Button>
          <Button
            onClick={() => router.push("/my-batches")}
            className="rounded-full"
          >
            My courses
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-9 animate-spin text-primary" />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
