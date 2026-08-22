"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentFailurePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center sm:p-10"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>

        <h1 className="font-display mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Payment <em className="text-destructive">cancelled.</em>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The transaction was declined or cancelled. You haven&apos;t been
          charged.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={() => router.push("/batches")}
            className="gap-2 rounded-full"
          >
            <BookOpen className="size-4" />
            Browse courses
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/my-batches")}
            className="gap-2 rounded-full"
          >
            <ArrowLeft className="size-4" />
            My courses
          </Button>
        </div>

        <p className="mt-7 text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="mailto:contact@grotutor.com"
            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Email us
          </a>
        </p>
      </motion.div>
    </div>
  );
}
