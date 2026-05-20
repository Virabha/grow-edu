"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/[0-9]/, "Must include a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword: data.password,
      });
      setSubmitted(true);
      toast.success("Password reset successfully!");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Reset failed. The link may have expired.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div>
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="size-6" />
        </div>
        <h1 className="font-display mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground">
          Invalid link.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Request new link
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div>
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="font-display mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground">
          Password reset.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You can now sign in with your new password.
        </p>
        <Button
          asChild
          className="mt-7 h-12 gap-2 rounded-full bg-foreground px-6 font-medium text-background hover:bg-foreground/90"
        >
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Set a new password
      </p>
      <h1 className="font-display mt-3 text-4xl font-medium leading-tight tracking-tight text-foreground">
        Reset.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Pick a password you&apos;ll remember — strong enough to keep things
        safe.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="reset-password"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            New password
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              id="reset-password"
              {...register("password")}
              disabled={loading}
              placeholder="Min. 8 characters"
              className="w-full rounded-lg border border-input bg-card px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPass ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reset-confirm"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              id="reset-confirm"
              {...register("confirmPassword")}
              disabled={loading}
              placeholder="Re-enter password"
              className="w-full rounded-lg border border-input bg-card px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full gap-2 rounded-full bg-foreground font-medium text-background shadow-lg shadow-foreground/15 transition-all hover:bg-foreground/90"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Resetting…
            </>
          ) : (
            <>Reset password</>
          )}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Back to sign in
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/images/landing/hero-student.jpg"
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="50vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/65 to-foreground/35" />
        <div className="absolute inset-0 bg-primary/15 mix-blend-multiply" />

        <div className="relative flex items-center justify-between p-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/logo.jpeg"
              alt="grotutor"
              width={40}
              height={40}
              className="rounded-lg shadow-md"
            />
            <span className="font-display text-xl font-medium tracking-tight">
              grotutor
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-background/70 transition-colors hover:text-background"
          >
            ← Back to home
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative max-w-md p-10"
        >
          <p className="font-display text-xs italic tracking-wide text-background/70">
            — A note on security
          </p>
          <h2 className="font-display mt-5 text-3xl font-medium leading-tight xl:text-4xl">
            One new password.{" "}
            <em className="text-primary">A fresh start.</em>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/80">
            We never store passwords in plain text. Pick something you&apos;ll
            remember.
          </p>
        </motion.div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpeg"
              alt="grotutor"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="font-display text-lg font-medium">grotutor</span>
          </Link>
          <Link href="/" className="text-xs text-muted-foreground">
            ← Home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <Suspense
              fallback={
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
