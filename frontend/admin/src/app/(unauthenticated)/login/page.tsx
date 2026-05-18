"use client";

import { motion } from "framer-motion";
import { Shield, Users, BookOpen, BarChart3, LogIn, ArrowRight, Sparkles } from "lucide-react";
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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const floatingIcons = [
  { icon: "ðŸ›¡ï¸", x: "15%", y: "20%", delay: 0 },
  { icon: "ðŸ’»", x: "80%", y: "15%", delay: 0.5 },
  { icon: "ðŸ“Š", x: "10%", y: "75%", delay: 1 },
  { icon: "ðŸš€", x: "85%", y: "70%", delay: 1.5 },
  { icon: "âš™ï¸", x: "50%", y: "10%", delay: 2 },
  { icon: "ðŸ“š", x: "25%", y: "90%", delay: 0.8 },
  { icon: "ðŸ†", x: "70%", y: "85%", delay: 1.2 },
];

const features = [
  { icon: Shield, text: "Secure Admin Access", color: "#3b82f6" },
  { icon: Users, text: "User Management", color: "#f97316" },
  { icon: BookOpen, text: "Course Management", color: "#10b981" },
  { icon: BarChart3, text: "Analytics Dashboard", color: "#ec4899" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const login = useLogin();

  const {
    register,
    handleSubmit,
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
    login.mutateAsync(data).catch((error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Gradient */}
      <div className="relative hidden w-1/2 overflow-hidden bg-linear-to-br from-primary via-[#3b82f6] to-[#8b5cf6] lg:flex lg:flex-col lg:justify-between">
        {/* Floating Icons */}
        {floatingIcons.map((item, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute text-3xl opacity-20 select-none"
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -25, 0],
              rotate: [0, 15, -15, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 5 + i * 0.7,
              repeat: Infinity,
              delay: item.delay,
              ease: "easeInOut",
            }}
          >
            {item.icon}
          </motion.span>
        ))}

        {/* Blur Orbs */}
        <motion.div
          className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Dot Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center p-6 xl:p-14">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-3 group"
            >
              <Image
                src="/logo.jpeg"
                alt="grotutor"
                width={44}
                height={44}
                className="rounded-xl shadow-lg transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-black text-white tracking-tight">
                grotutor
              </span>
            </Link>

            <h2 className="text-3xl font-black leading-tight text-white xl:text-4xl">
              Admin Control
              <br />
              Center
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Manage courses, users, and analytics from a single powerful
              dashboard. Built for administrators.
            </p>
          </motion.div>

          {/* Feature Badges */}
          <div className="relative z-10 mt-10 grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3 backdrop-blur-sm"
              >
                <f.icon className="size-4 shrink-0 text-white/80" />
                <span className="text-xs font-semibold text-white/90">
                  {f.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Social Proof Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="relative z-10 mt-8"
          >
            <div className="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3 backdrop-blur-sm">
              <Shield className="size-4 text-white/70" />
              <p className="text-xs text-white/70">
                Secure admin portal with role-based access control
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Logo */}
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpeg"
              alt="grotutor"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-base font-black">
              <span className="text-primary">gro</span>tutor
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-black text-foreground">
                Admin Sign In
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your credentials to access the admin panel.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-5"
              aria-label="Login form"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold text-foreground"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-auto rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  {...register("email")}
                  disabled={login.isPending}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    className="mt-1 text-xs text-destructive"
                    role="alert"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold text-foreground"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  className="h-auto rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  {...register("password")}
                  disabled={login.isPending}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                {errors.password && (
                  <p
                    id="password-error"
                    className="mt-1 text-xs text-destructive"
                    role="alert"
                  >
                    {errors.password.message}
                  </p>
                )}
                <div className="mt-1.5 flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 rounded-xl bg-primary py-3 font-bold shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all h-12"
                disabled={login.isPending}
              >
                <LogIn className="size-4" />
                {login.isPending ? "Signing in..." : "Sign In"}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-xl border-2 py-3 hover:border-primary hover:-translate-y-0.5 transition-all h-12"
                asChild
              >
                <Link href="/signup">
                  <Sparkles className="size-4 text-primary" /> Apply for Access{" "}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
