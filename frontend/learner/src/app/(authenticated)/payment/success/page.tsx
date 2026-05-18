"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useVerifyPayment } from "@/lib/hooks/use-payments";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, XCircle, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const {
    mutate: verifyPayment,
    isPending,
    isSuccess,
    isError,
    error,
  } = useVerifyPayment();

  const [countdown, setCountdown] = useState(5);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (sessionId) {
      verifyPayment({ sessionId });
    }
  }, [sessionId, verifyPayment]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/my-courses");
    }
  }, [shouldRedirect, router]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShouldRedirect(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccess]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] font-poppins">
        <Card className="w-full max-w-md p-8 text-center border-none shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardContent>
            <XCircle className="w-20 h-20 text-destructive mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Invalid Session</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              No payment session ID found. Please verify your payment source.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              size="lg"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4 font-poppins relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-2xl border-none shadow-none bg-transparent relative z-10">
        <CardContent className="flex flex-col items-center justify-center text-center p-0 min-h-[400px]">
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-10">
                  <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-ping" />
                  <Loader2 className="w-24 h-24 text-primary animate-spin relative z-10" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -inset-4 border-2 border-primary/20 rounded-full border-dashed"
                  />
                </div>
                <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-400 to-primary/60">
                  Verifying Payment
                </h1>
                <p className="text-muted-foreground text-xl">
                  Securing your enrollment...
                </p>
              </motion.div>
            )}

            {isSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex flex-col items-center w-full"
              >
                <div className="relative mb-8">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.2,
                    }}
                    className="relative z-10"
                  >
                    <Image
                      src="/illustrations/stripe_payments.svg"
                      width={250}
                      height={200}
                      alt="Payment Success"
                      className="drop-shadow-xl"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.5 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="absolute inset-0 bg-green-400/30 rounded-full blur-xl"
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 20, x: -20 }}
                    animate={{ opacity: 1, y: -40, x: -60 }}
                    transition={{ delay: 0.6, duration: 2, type: "spring" }}
                    className="absolute top-0 left-0 text-yellow-500"
                  >
                    <Trophy className="w-12 h-12 -rotate-15" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: 20 }}
                    animate={{ opacity: 1, y: -50, x: 60 }}
                    transition={{ delay: 0.8, duration: 2, type: "spring" }}
                    className="absolute top-0 right-0 text-amber-400"
                  >
                    <Star className="w-10 h-10 rotate-[15deg] fill-current" />
                  </motion.div>
                </div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-5xl font-extrabold mb-4 text-foreground tracking-tight"
                >
                  Payment <span className="text-green-500">Successful!</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-muted-foreground text-xl mb-10 max-w-lg leading-relaxed"
                >
                  You&apos;re all set! Get ready to level up your skills.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="w-full max-w-md bg-card/60 rounded-2xl p-6 mb-8 backdrop-blur-md border border-border/50 shadow-lg"
                >
                  <p className="text-lg text-center font-medium text-foreground mb-3">
                    Redirecting to your learning dashboard
                  </p>
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground mt-2">
                    <span className="font-bold text-foreground">
                      {countdown}
                    </span>{" "}
                    seconds remaining...
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex gap-4 w-full justify-center"
                >
                  <Button
                    onClick={() => router.push("/my-courses")}
                    className="w-full max-w-[200px] h-12 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
                  >
                    Go Now
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-8">
                  <div className="rounded-full bg-red-500/10 p-6 shadow-xl shadow-red-500/20">
                    <XCircle className="w-24 h-24 text-red-500" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold mb-4 text-red-500">
                  Verification Failed
                </h1>
                <p className="text-muted-foreground text-xl mb-8 max-w-md">
                  We couldn&apos;t verify your payment. Please try again or
                  contact support.
                </p>
                {error && (
                  <div className="w-full max-w-md text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-6 rounded-xl mb-8 border border-red-200 dark:border-red-900/20 shadow-inner">
                    <span className="font-semibold block mb-2 text-lg">
                      Error Details:
                    </span>
                    {error instanceof Error
                      ? error.message
                      : "An unknown error occurred"}
                  </div>
                )}
                <div className="flex gap-4">
                  <Button
                    onClick={() => verifyPayment({ sessionId })}
                    size="lg"
                    className="shadow-lg"
                  >
                    Retry Verification
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/contact")}
                    size="lg"
                  >
                    Contact Support
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary/50" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
