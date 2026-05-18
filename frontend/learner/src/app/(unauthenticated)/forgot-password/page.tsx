"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setLoading(true);
    try {
      await apiClient.post("/auth/forgot-password", { email: data.email });
      setSubmitted(true);
      toast.success("Reset link sent to your email.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-linear-to-br from-primary via-[#3b82f6] to-[#8b5cf6] lg:flex lg:flex-col lg:justify-center">
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
              Forgot your<br />password?
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              No worries — we&apos;ll send you a secure link to reset your password and get you back on track.
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
            {submitted ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="size-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-black text-foreground">Check Your Email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;ve sent a password reset link to your email address. Please check your inbox and spam folder.
                </p>
                <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft className="size-3.5" /> Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-black text-foreground">Forgot Password</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold text-foreground">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                      <input
                        type="email"
                        id="forgot-email"
                        {...register("email")}
                        disabled={loading}
                        placeholder="you@email.com"
                        className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <Button type="submit" disabled={loading} className="w-full gap-2 rounded-xl bg-primary py-3 font-bold shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all h-12">
                    {loading ? (
                      <><Loader2 className="size-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Mail className="size-4" /> Send Reset Link</>
                    )}
                  </Button>
                </form>

                <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft className="size-3.5" /> Back to Sign In
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
