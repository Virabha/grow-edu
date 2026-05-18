"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, ArrowRight, Sparkles, BookOpen, Users, Award, Zap, Loader2, GraduationCap, Monitor, BarChart3, Rocket, Star, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import Link from "next/link";
import { toast } from "sonner";
import { useLogin } from "@/lib/hooks/use-auth";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const floatingIcons: { icon: LucideIcon; x: string; y: string; delay: number }[] = [
  { icon: GraduationCap, x: "15%", y: "20%", delay: 0 },
  { icon: Monitor, x: "80%", y: "15%", delay: 0.5 },
  { icon: BarChart3, x: "10%", y: "75%", delay: 1 },
  { icon: Rocket, x: "85%", y: "70%", delay: 1.5 },
  { icon: Star, x: "50%", y: "10%", delay: 2 },
  { icon: BookOpen, x: "25%", y: "90%", delay: 0.8 },
  { icon: Trophy, x: "70%", y: "85%", delay: 1.2 },
];

const features = [
  { icon: BookOpen, text: "10+ Expert Courses", color: "#3b82f6" },
  { icon: Users, text: "1000+ Active Students", color: "#f97316" },
  { icon: Award, text: "10+ Industry Certificates", color: "#10b981" },
  { icon: Zap, text: "96% Success Rate", color: "#ec4899" },
];

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
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-[#000052]  lg:flex lg:flex-col lg:justify-between">
        {floatingIcons.map((item, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute opacity-15 select-none"
            style={{ left: item.x, top: item.y }}
            animate={{ y: [0, -25, 0], rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 5 + i * 0.7, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
          >
            <item.icon className="size-7 text-white" />
          </motion.span>
        ))}

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

        <div className="relative z-10 flex flex-1 flex-col justify-center p-6 xl:p-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/" className="mb-8 inline-flex items-center gap-3 group">
              <Image src="/logo.jpeg" alt="grotutor" width={44} height={44} className="rounded-xl shadow-lg transition-transform group-hover:scale-105" />
              <span className="text-xl font-black text-white tracking-tight">grotutor</span>
            </Link>

            <h2 className="text-3xl font-black leading-tight text-white xl:text-4xl">
              Welcome back to<br />
              your learning journey
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              {BRAND.description}
            </p>
          </motion.div>

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
                <span className="text-xs font-semibold text-white/90">{f.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="relative z-10 mt-8"
          >
            <div className="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3 backdrop-blur-sm">
              <div className="flex -space-x-2">
                {["NP", "VK", "PS"].map((initials, i) => (
                  <div key={initials} className="flex size-7 items-center justify-center rounded-full border-2 border-white/20 bg-white/15 text-[10px] font-bold text-white">
                    {initials}
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/70">
                <span className="font-bold text-white">2,400+</span> students joined this week
              </p>
            </div>
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
            <div className="mb-8">
              <h1 className="text-2xl font-black text-foreground">Sign In</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">Register free</Link>
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-foreground">Email Address</label>
                <input
                  type="email" id="login-email"
                  {...register("email")}
                  disabled={login.isPending}
                  placeholder="you@email.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} id="login-password"
                    {...register("password")}
                    disabled={login.isPending}
                    placeholder="Your password"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
                <div className="mt-1.5 flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
              </div>

              <Button type="submit" disabled={login.isPending} className="w-full gap-2 rounded-xl bg-primary py-3 font-bold shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all h-12">
                {login.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Signing in...</>
                ) : (
                  <><LogIn className="size-4" /> Sign In</>
                )}
              </Button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" variant="outline" className="w-full gap-2 rounded-xl border-2 py-3 hover:border-primary hover:-translate-y-0.5 transition-all h-12" asChild>
                <Link href="/register">
                  <Sparkles className="size-4 text-primary" /> Create New Account <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
