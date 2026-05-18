"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus, CheckCircle2, ArrowRight, Shield, Sparkles, TrendingUp, Clock, Loader2, Monitor, BarChart3, Target, Trophy, BookOpen, Rocket, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRegister } from "@/lib/hooks/use-auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const perks = [
  { icon: CheckCircle2, text: "Lifetime course access", color: "text-green-300" },
  { icon: Shield, text: "Industry-recognised certificates", color: "text-blue-300" },
  { icon: Sparkles, text: "AI-powered learning paths", color: "text-amber-300" },
  { icon: TrendingUp, text: "95% success rate", color: "text-emerald-300" },
  { icon: Clock, text: "7-day refund guarantee", color: "text-rose-300" },
];

const orbits: { size: number; duration: number; items: LucideIcon[] }[] = [
  { size: 280, duration: 20, items: [Monitor, BarChart3, Target] },
  { size: 380, duration: 30, items: [Trophy, BookOpen, Rocket, Star] },
];

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const registerUser = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    try {
      await registerUser.mutateAsync({
        firstName,
        lastName,
        email: data.email,
        password: data.password,
      });
      toast.success("Account created! Please sign in.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Registration failed. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-[#000052] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          {orbits.map((orbit, oi) => (
            <motion.div
              key={oi}
              className="absolute rounded-full border border-white/10"
              style={{ width: orbit.size, height: orbit.size }}
              animate={{ rotate: 360 }}
              transition={{ duration: orbit.duration, repeat: Infinity, ease: "linear" }}
            >
              {orbit.items.map((Icon, ei) => {
                const angle = (360 / orbit.items.length) * ei;
                const rad = (angle * Math.PI) / 180;
                const x = Math.cos(rad) * (orbit.size / 2);
                const y = Math.sin(rad) * (orbit.size / 2);
                return (
                  <motion.span
                    key={ei}
                    className="absolute opacity-25"
                    style={{ left: `calc(50% + ${x}px - 10px)`, top: `calc(50% + ${y}px - 10px)` }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: orbit.duration, repeat: Infinity, ease: "linear" }}
                  >
                    <Icon className="size-5 text-white" />
                  </motion.span>
                );
              })}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: "28px 28px" }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 flex-col justify-center p-10 xl:p-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Link href="/" className="mb-8 inline-flex items-center gap-3 group">
              <Image src="/logo.jpeg" alt="Loshi Edu" width={44} height={44} className="rounded-xl shadow-lg transition-transform group-hover:scale-105" />
              <span className="text-xl font-black text-white tracking-tight">Loshi Edu</span>
            </Link>

            <h2 className="text-3xl font-black leading-tight text-white xl:text-4xl">
              Transform your<br />
              learning journey
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Join 1000+ learners building skills, advancing careers, and achieving lifelong success.
            </p>
          </motion.div>

          <div className="relative z-10 mt-8 space-y-2">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.text}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-3 rounded-xl bg-white/8 px-4 py-2.5 backdrop-blur-sm"
              >
                <perk.icon className={cn("size-4 shrink-0", perk.color)} />
                <span className="text-sm text-white">{perk.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.jpeg" alt="Loshi Edu" width={32} height={32} className="rounded-lg" />
            <span className="text-base font-black"><span className="text-primary">Loshi</span> Edu</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-black text-foreground">Create Account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="register-name" className="mb-1.5 block text-xs font-semibold text-foreground">Full Name</label>
                <input
                  id="register-name"
                  {...register("name")}
                  disabled={registerUser.isPending}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="register-email" className="mb-1.5 block text-xs font-semibold text-foreground">Email</label>
                <input
                  type="email" id="register-email"
                  {...register("email")}
                  disabled={registerUser.isPending}
                  placeholder="you@email.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="register-password" className="mb-1.5 block text-xs font-semibold text-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} id="register-password"
                    {...register("password")}
                    disabled={registerUser.isPending}
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

              <Button type="submit" disabled={registerUser.isPending} className="w-full gap-2 rounded-xl bg-primary py-3 font-bold shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all h-12">
                {registerUser.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Creating account...</>
                ) : (
                  <><UserPlus className="size-4" /> Create Account <ArrowRight className="size-3.5" /></>
                )}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                By signing up you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms</Link>{" "}
                &amp;{" "}
                <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
