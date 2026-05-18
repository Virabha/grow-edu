"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useRegister } from "@/features/auth/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { GraduationCap, Award, Users, Zap } from "lucide-react";

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
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
});

type SignupFormData = z.infer<typeof signupSchema>;

const floatingIcons = [
  { icon: "\u{1F393}", x: "15%", y: "20%", delay: 0 },
  { icon: "\u{1F4BB}", x: "80%", y: "15%", delay: 0.5 },
  { icon: "\u{1F4CA}", x: "10%", y: "75%", delay: 1 },
  { icon: "\u{1F680}", x: "85%", y: "70%", delay: 1.5 },
  { icon: "\u2B50", x: "50%", y: "10%", delay: 2 },
];

const features = [
  { icon: GraduationCap, text: "Expert-Led Courses", color: "#6366f1" },
  { icon: Award, text: "Verified Certificates", color: "#f97316" },
  { icon: Users, text: "Growing Community", color: "#10b981" },
  { icon: Zap, text: "Learn at Your Pace", color: "#ec4899" },
];

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
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
      .then(() => {
        toast.success(
          "Account created! Please check your email to verify your account."
        );
      })
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.";
        toast.error(errorMessage);
      });
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Gradient with decorations */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-[#6366f1] to-[#8b5cf6]">
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Blur orbs */}
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-300/10 rounded-full blur-3xl" />

        {/* Floating emoji icons */}
        {floatingIcons.map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-3xl"
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: item.delay,
              ease: "easeInOut",
            }}
          >
            {item.icon}
          </motion.div>
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm border border-white/30 shadow-xl">
              <Image
                src="/logo.jpeg"
                alt="Loshi Edu"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl font-bold text-white mb-3">
              Join the Platform
            </h1>
            <p className="text-white/80 text-lg max-w-sm">
              Create your account and start your learning journey with thousands
              of students worldwide.
            </p>
          </motion.div>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-3 w-full max-w-sm"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: feature.color + "30" }}
                >
                  <feature.icon
                    className="w-4 h-4"
                    style={{ color: feature.color }}
                  />
                </div>
                <span className="text-white text-sm font-medium">
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden mb-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary/10 border border-primary/20">
              <Image
                src="/logo.jpeg"
                alt="Loshi Edu"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <header className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Create Account
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Join Loshi Edu in minutes.
            </p>
          </header>

          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4"
            aria-label="Registration form"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="fullName"
                className="text-foreground font-medium text-sm"
              >
                Full Name
              </Label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("fullName")}
                disabled={registerUser.isPending}
                aria-describedby={
                  errors.fullName ? "fullname-error" : undefined
                }
              />
              {errors.fullName && (
                <p
                  id="fullname-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-foreground font-medium text-sm"
              >
                Email Address
              </Label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("email")}
                disabled={registerUser.isPending}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p
                  id="email-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-foreground font-medium text-sm"
              >
                Password
              </Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 rounded-xl border border-input bg-background px-4 py-3 text-sm"
                {...register("password")}
                disabled={registerUser.isPending}
                aria-describedby={
                  errors.password ? "password-error" : "password-hint"
                }
              />
              {errors.password ? (
                <p
                  id="password-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              ) : (
                <p
                  id="password-hint"
                  className="text-xs text-muted-foreground"
                >
                  Must include uppercase, lowercase, number, and special
                  character (@$!%*?&amp;)
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 rounded-xl"
              disabled={registerUser.isPending}
            >
              {registerUser.isPending
                ? "Creating Account..."
                : "Create Account"}
            </Button>

            <div className="text-center text-sm pt-2">
              <span className="text-muted-foreground">
                Already a member?{" "}
              </span>
              <Link
                href="/login"
                className="text-primary hover:underline font-semibold"
              >
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
