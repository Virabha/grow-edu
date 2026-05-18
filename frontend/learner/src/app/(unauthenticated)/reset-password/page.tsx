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
      .min(8, "Password must be at least 8 characters")
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
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100">
          <Lock className="size-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Invalid Link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-3.5" /> Request New Link
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Password Reset!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground">Reset Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new strong password for your account.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-xs font-semibold text-foreground">New Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              id="reset-password"
              {...register("password")}
              disabled={loading}
              placeholder="Min. 8 characters"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reset-confirm" className="mb-1.5 block text-xs font-semibold text-foreground">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              id="reset-confirm"
              {...register("confirmPassword")}
              disabled={loading}
              placeholder="Re-enter password"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full gap-2 rounded-xl bg-primary py-3 font-bold shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all h-12">
          {loading ? (
            <><Loader2 className="size-4 animate-spin" /> Resetting...</>
          ) : (
            <><Lock className="size-4" /> Reset Password</>
          )}
        </Button>
      </form>

      <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-3.5" /> Back to Sign In
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-linear-to-br from-[#3b82f6] via-primary to-[#8b5cf6] lg:flex lg:flex-col lg:justify-center">
        <motion.div
          className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "32px 32px" }}
          aria-hidden
        />
        <div className="relative z-10 p-6 xl:p-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/" className="mb-8 inline-flex items-center gap-3 group">
              <Image src="/logo.jpeg" alt="grotutor" width={44} height={44} className="rounded-xl shadow-lg transition-transform group-hover:scale-105" />
              <span className="text-xl font-black text-white tracking-tight">grotutor</span>
            </Link>
            <h2 className="text-3xl font-black leading-tight text-white xl:text-4xl">
              Create a new<br />password
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Choose a strong password to keep your account secure. Use a mix of letters, numbers, and symbols.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.jpeg" alt="grotutor" width={32} height={32} className="rounded-lg" />
            <span className="text-base font-black"><span className="text-primary">gro</span>tutor</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
            <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
              <ResetPasswordForm />
            </Suspense>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
