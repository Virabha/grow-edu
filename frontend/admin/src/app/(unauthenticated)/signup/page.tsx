"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useRegister } from "@/features/auth/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiError } from "@/lib/api/errors";
import type { FieldPath } from "react-hook-form";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2, CheckCircle2 } from "lucide-react";

const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password must not exceed 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
});

type SignupFormData = z.infer<typeof signupSchema>;

const perks = [
  "Course authoring tools",
  "Catalogue management",
  "Real-time analytics",
  "Payment & enrolment control",
];

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  function handleFormSubmit(data: SignupFormData) {
    const [firstName, ...lastNameParts] = data.fullName.split(" ");
    const lastName = lastNameParts.join(" ");

    registerUser
      .mutateAsync({
        email: data.email,
        password: data.password,
        firstName,
        lastName,
      })
      .catch((err: unknown) => {
        const apiError = getApiError(err, "Registration failed. Please try again.");
        for (const [field, message] of Object.entries(apiError.fieldErrors)) {
          setError(field as FieldPath<SignupFormData>, { type: "server", message });
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
            — A note for instructors
          </p>
          <h2 className="font-display mt-5 text-3xl font-medium leading-tight xl:text-4xl">
            Build courses that{" "}
            <em className="text-primary">actually ship.</em>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/80">
            Apply for an instructor account. You&apos;ll get production tools,
            cohort management, and transparent revenue share.
          </p>
          <ul className="mt-7 space-y-2.5">
            {perks.map((p) => (
              <li
                key={p}
                className="flex items-center gap-2.5 text-sm text-background/85"
              >
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                {p}
              </li>
            ))}
          </ul>
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
              Apply for access
            </p>
            <h1 className="font-display mt-3 text-4xl font-medium leading-tight tracking-tight text-foreground">
              Create your account.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Already on the platform?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>

            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="mt-8 space-y-5"
              aria-label="Registration form"
            >
              <div>
                <Label
                  htmlFor="fullName"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Full name
                </Label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  className="flex h-12 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/55 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("fullName")}
                  disabled={registerUser.isPending}
                />
                {errors.fullName && (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Email
                </Label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@somewhere.com"
                  className="flex h-12 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/55 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("email")}
                  disabled={registerUser.isPending}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="h-12 rounded-lg border border-input bg-card px-4 py-3 text-sm"
                  {...register("password")}
                  disabled={registerUser.isPending}
                />
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Must include uppercase, lowercase, number & special
                    character (@$!%*?&amp;).
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={registerUser.isPending}
                className="group h-12 w-full gap-2 rounded-full bg-foreground font-medium text-background shadow-lg shadow-foreground/15 transition-all hover:bg-foreground/90"
              >
                {registerUser.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating
                    account…
                  </>
                ) : (
                  <>
                    Apply
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
