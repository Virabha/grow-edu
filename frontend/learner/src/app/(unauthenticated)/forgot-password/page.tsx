"use client";

import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForgotPassword } from "@/lib/hooks/use-auth";
import { getApiError } from "@/lib/api/errors";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const forgot = useForgotPassword();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const loading = forgot.isPending;

  const onSubmit = async (data: ForgotFormValues) => {
    try {
      await forgot.mutateAsync(data.email);
      setSubmitted(true);
      toast.success("Reset link sent to your email.");
    } catch (err) {
      const apiError = getApiError(err, "Something went wrong. Please try again.");
      toast.error(apiError.message);
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        setError(field as FieldPath<ForgotFormValues>, { message });
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/images/landing/books.jpg"
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
              src="/logo.png"
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
            — A note for the moment
          </p>
          <h2 className="font-display mt-5 text-3xl font-medium leading-tight xl:text-4xl">
            Forgetting is{" "}
            <em className="text-primary">human.</em>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/80">
            Enter your email — we&apos;ll send a secure reset link that&apos;s
            valid for one hour.
          </p>
        </motion.div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
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
            {submitted ? (
              <div>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="size-6" />
                </div>
                <h1 className="font-display mt-5 text-3xl font-medium leading-tight tracking-tight text-foreground">
                  Check your email.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  We&apos;ve sent a reset link to your address. Check your
                  inbox — and your spam folder, just in case.
                </p>
                <Link
                  href="/login"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  <ArrowLeft className="size-3.5" /> Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Reset your password
                </p>
                <h1 className="font-display mt-3 text-4xl font-medium leading-tight tracking-tight text-foreground">
                  Forgot it?
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  No problem. Enter the email tied to your account.
                </p>

                <form
                  className="mt-8 space-y-5"
                  onSubmit={handleSubmit(onSubmit)}
                >
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/55" />
                      <input
                        type="email"
                        id="forgot-email"
                        {...register("email")}
                        disabled={loading}
                        placeholder="you@somewhere.com"
                        className="w-full rounded-lg border border-input bg-card py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="group h-12 w-full gap-2 rounded-full bg-foreground font-medium text-background shadow-lg shadow-foreground/15 transition-all hover:bg-foreground/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>Send reset link</>
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
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
