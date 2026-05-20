"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowUpRight, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLogin } from "@/lib/hooks/use-auth";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login.mutateAsync(data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Login failed. Please check your credentials.";
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/images/landing/classroom-1.jpg"
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
            — A note for newcomers
          </p>
          <h2 className="font-display mt-5 text-3xl font-medium leading-tight xl:text-4xl">
            Pick up{" "}
            <em className="text-primary">where you left off.</em>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/80">
            Your courses, notes, and progress are exactly as you left them.
            Sign in and keep building.
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="font-display mt-3 text-4xl font-medium leading-tight tracking-tight text-foreground">
              Sign in.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              New to grotutor?{" "}
              <Link
                href="/register"
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Create an account
              </Link>
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="login-email"
                  {...register("email")}
                  disabled={login.isPending}
                  placeholder="you@somewhere.com"
                  className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    id="login-password"
                    {...register("password")}
                    disabled={login.isPending}
                    placeholder="Your password"
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

              <Button
                type="submit"
                disabled={login.isPending}
                className="group h-12 w-full gap-2 rounded-full bg-foreground font-medium text-background shadow-lg shadow-foreground/15 transition-all hover:bg-foreground/90"
              >
                {login.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-10 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Protected by industry-standard encryption.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
