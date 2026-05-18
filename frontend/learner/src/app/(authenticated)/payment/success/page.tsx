"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMyPayment } from "@/lib/hooks/use-payments";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("paymentId");

  const { data: payment, isLoading } = useMyPayment(paymentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const status = payment?.status;
  const isCompleted = status === "COMPLETED";
  const isPending = status === "PROOF_UPLOADED" || status === "PENDING";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-semibold">Payment verified</h2>
              <p className="text-sm text-muted-foreground">
                You&apos;re enrolled. Jump in and start learning.
              </p>
            </>
          ) : isPending ? (
            <>
              <Clock className="h-12 w-12 text-amber-500" />
              <h2 className="text-xl font-semibold">Awaiting verification</h2>
              <p className="text-sm text-muted-foreground">
                Your proof is in the queue. You&apos;ll get an email as soon as it&apos;s verified.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-semibold">Thank you</h2>
              <p className="text-sm text-muted-foreground">
                Your payment was recorded.
              </p>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push("/courses")}>
              Browse more
            </Button>
            <Button onClick={() => router.push("/my-courses")}>
              My courses
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
