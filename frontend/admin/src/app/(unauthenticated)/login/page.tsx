"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useLogin } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { getApiError } from "@/lib/api/errors";
import type { FieldPath } from "react-hook-form";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  function handleFormSubmit(data: LoginFormData) {
    login.mutateAsync(data).catch((err: unknown) => {
      const apiError = getApiError(err, "Login failed. Please check your credentials.");
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        setError(field as FieldPath<LoginFormData>, { type: "server", message });
      }
      if (Object.keys(apiError.fieldErrors).length === 0) {
        toast.error(apiError.message);
      }
    });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-1/2 overflow-hidden bg-foreground text-background lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/90 to-foreground/65" />
        <div className="absolute inset-0 bg-primary/15 mix-blend-multiply" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />

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
              grotutor / admin
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative max-w-md p-10"
        >
          <p className="font-display text-xs italic tracking-wide text-background/70">
            — A private place
          </p>
          <h2 className="font-display mt-5 text-3xl font-medium leading-tight xl:text-4xl">
            Where the platform{" "}
            <em className="text-primary">is run.</em>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/80">
            Manage courses, learners, payments and the catalogue from a single,
            quiet console.
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
            <span className="font-display text-lg font-medium">
              grotutor / admin
            </span>
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
              Admin console
            </p>
            <h1 className="font-display mt-3 text-4xl font-medium leading-tight tracking-tight text-foreground">
              Sign in.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Enter your credentials to access the dashboard.
            </p>

            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="mt-8 space-y-5"
              aria-label="Login form"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@grotutor.com"
                  className="h-auto rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/55 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                  {...register("email")}
                  disabled={login.isPending}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-end justify-between">
                  <label
                    htmlFor="password"
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
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="h-auto rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/55 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                  {...register("password")}
                  disabled={login.isPending}
                />
                {errors.password && (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
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

              <p className="text-center text-[11px] text-muted-foreground">
                Need access?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Apply here
                </Link>
                .
              </p>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
