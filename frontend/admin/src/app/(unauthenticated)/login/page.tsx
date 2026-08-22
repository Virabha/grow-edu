"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  useLogin,
  useCompleteSecondFactor,
  useConfirmSecondFactor,
} from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { getApiError } from "@/lib/api/errors";
import type { SecondFactorSetupPayload } from "@/features/auth/types";
import type { FieldPath } from "react-hook-form";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const codeSchema = z.object({
  code: z
    .string()
    .min(6, "Code must be at least 6 characters")
    .max(32, "Code is too long"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type CodeFormData = z.infer<typeof codeSchema>;

type LoginStep =
  | { kind: "credentials" }
  | { kind: "challenge"; challengeToken: string }
  | { kind: "setup"; setupToken: string; setup: SecondFactorSetupPayload };

const inputClass =
  "h-auto rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/55 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15";

const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const errorClass = "mt-1.5 text-xs text-destructive";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const login = useLogin();
  const completeSecondFactor = useCompleteSecondFactor();
  const confirmSecondFactor = useConfirmSecondFactor();
  const [loginStep, setLoginStep] = useState<LoginStep>({
    kind: "credentials",
  });
  const [copied, setCopied] = useState<"secret" | "uri" | null>(null);

  const credentialsForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  });

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  function handleCredentialsSubmit(data: LoginFormData) {
    login
      .mutateAsync(data)
      .then((result) => {
        if (!("secondFactorRequired" in result)) return;
        if (result.code === "SECOND_FACTOR_REQUIRED") {
          setLoginStep({
            kind: "challenge",
            challengeToken: result.challengeToken,
          });
        } else {
          setLoginStep({
            kind: "setup",
            setupToken: result.setupToken,
            setup: result.setup,
          });
        }
      })
      .catch((err: unknown) => {
        const apiError = getApiError(
          err,
          "Login failed. Please check your credentials.",
        );
        for (const [field, message] of Object.entries(apiError.fieldErrors)) {
          credentialsForm.setError(field as FieldPath<LoginFormData>, {
            type: "server",
            message,
          });
        }
        if (Object.keys(apiError.fieldErrors).length === 0) {
          toast.error(apiError.message);
        }
      });
  }

  function handleChallengeSubmit(data: CodeFormData) {
    if (loginStep.kind !== "challenge") return;
    completeSecondFactor
      .mutateAsync({
        challengeToken: loginStep.challengeToken,
        code: data.code,
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "That code was not accepted. Please try again.";
        toast.error(message);
      });
  }

  function handleSetupSubmit(data: CodeFormData) {
    if (loginStep.kind !== "setup") return;
    confirmSecondFactor
      .mutateAsync({ challengeToken: loginStep.setupToken, code: data.code })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "That code was not accepted. Please try again.";
        toast.error(message);
      });
  }

  function copyToClipboard(text: string, which: "secret" | "uri") {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(which);
        setTimeout(() => setCopied(null), 2000);
      },
      () => {
        toast.error("Could not copy to clipboard.");
      },
    );
  }

  const asidePanel = (
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
          Where the platform <em className="text-primary">is run.</em>
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/80">
          Manage courses, learners, payments and the catalogue from a single,
          quiet console.
        </p>
      </motion.div>
    </aside>
  );

  const mobileHeader = (
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
  );

  return (
    <div className="flex min-h-screen bg-background">
      {asidePanel}

      <main className="flex flex-1 flex-col">
        {mobileHeader}

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <motion.div
            key={loginStep.kind}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            {loginStep.kind === "credentials" && (
              <>
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
                  onSubmit={credentialsForm.handleSubmit(
                    handleCredentialsSubmit,
                  )}
                  className="mt-8 space-y-5"
                  aria-label="Login form"
                >
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@grotutor.com"
                      className={inputClass}
                      {...credentialsForm.register("email")}
                      disabled={login.isPending}
                    />
                    {credentialsForm.formState.errors.email && (
                      <p className={errorClass} role="alert">
                        {credentialsForm.formState.errors.email.message}
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
                      className={inputClass}
                      {...credentialsForm.register("password")}
                      disabled={login.isPending}
                    />
                    {credentialsForm.formState.errors.password && (
                      <p className={errorClass} role="alert">
                        {credentialsForm.formState.errors.password.message}
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
              </>
            )}

            {loginStep.kind === "challenge" && (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <ShieldCheck className="size-5 text-primary" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Two-step verification
                  </p>
                </div>
                <h1 className="font-display mt-4 text-3xl font-medium leading-tight tracking-tight text-foreground">
                  Enter your code.
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Open your authenticator app and enter the 6-digit code, or
                  paste one of your recovery codes.
                </p>

                <form
                  onSubmit={codeForm.handleSubmit(handleChallengeSubmit)}
                  className="mt-8 space-y-5"
                  aria-label="Two-factor verification form"
                >
                  <div>
                    <label htmlFor="code" className={labelClass}>
                      Code
                    </label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      className={inputClass}
                      {...codeForm.register("code")}
                      disabled={completeSecondFactor.isPending}
                    />
                    {codeForm.formState.errors.code && (
                      <p className={errorClass} role="alert">
                        {codeForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={completeSecondFactor.isPending}
                    className="group h-12 w-full gap-2 rounded-full bg-foreground font-medium text-background shadow-lg shadow-foreground/15 transition-all hover:bg-foreground/90"
                  >
                    {completeSecondFactor.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      <>
                        Verify
                        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Wrong account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        codeForm.reset();
                        setLoginStep({ kind: "credentials" });
                      }}
                      className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      Start over
                    </button>
                    .
                  </p>
                </form>
              </>
            )}

            {loginStep.kind === "setup" && (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <ShieldAlert className="size-5 text-primary" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Set up two-factor auth
                  </p>
                </div>
                <h1 className="font-display mt-4 text-3xl font-medium leading-tight tracking-tight text-foreground">
                  Secure your account.
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Staff accounts require a second factor. Scan the code below
                  with your authenticator app, or enter the key by hand, then
                  type the 6-digit code it shows.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className={labelClass}>Scan with your authenticator app</p>
                    <div className="flex justify-center rounded-lg border border-input bg-white p-4">
                      <QRCode
                        value={loginStep.setup.otpauthUri}
                        size={192}
                        aria-label="QR code for authenticator app setup"
                      />
                    </div>
                  </div>

                  <div>
                    <p className={labelClass}>Authenticator URI</p>
                    <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3 py-2">
                      <span className="flex-1 truncate font-mono text-xs text-foreground">
                        {loginStep.setup.otpauthUri}
                      </span>
                      <button
                        type="button"
                        aria-label="Copy URI"
                        onClick={() =>
                          copyToClipboard(loginStep.setup.otpauthUri, "uri")
                        }
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copied === "uri" ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className={labelClass}>Secret key</p>
                    <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3 py-2">
                      <span className="flex-1 break-all font-mono text-xs text-foreground">
                        {loginStep.setup.secret}
                      </span>
                      <button
                        type="button"
                        aria-label="Copy secret"
                        onClick={() =>
                          copyToClipboard(loginStep.setup.secret, "secret")
                        }
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        {copied === "secret" ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-destructive">
                      Save your recovery codes — shown once only
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {loginStep.setup.recoveryCodes.map((rc) => (
                        <span
                          key={rc}
                          className="font-mono text-xs text-foreground"
                        >
                          {rc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={codeForm.handleSubmit(handleSetupSubmit)}
                  className="mt-6 space-y-5"
                  aria-label="Confirm two-factor setup"
                >
                  <div>
                    <label htmlFor="setup-code" className={labelClass}>
                      6-digit code from your authenticator
                    </label>
                    <Input
                      id="setup-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      className={inputClass}
                      {...codeForm.register("code")}
                      disabled={confirmSecondFactor.isPending}
                    />
                    {codeForm.formState.errors.code && (
                      <p className={errorClass} role="alert">
                        {codeForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={confirmSecondFactor.isPending}
                    className="group h-12 w-full gap-2 rounded-full bg-foreground font-medium text-background shadow-lg shadow-foreground/15 transition-all hover:bg-foreground/90"
                  >
                    {confirmSecondFactor.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Confirming…
                      </>
                    ) : (
                      <>
                        Confirm and sign in
                        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
