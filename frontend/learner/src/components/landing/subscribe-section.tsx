"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { useSubscribe } from "@/lib/hooks/use-contact";
import { toast } from "sonner";

export function SubscribeSection() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = useSubscribe();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate(
      { email },
      {
        onSuccess: () => {
          setDone(true);
          toast.success("Subscribed successfully!");
        },
        onError: () => {
          toast.error("Failed to subscribe. Please try again.");
        },
      }
    );
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-[#000052] px-6 py-12 sm:px-10 sm:py-14 md:px-16 md:py-10">
          {/* Decorative background circles */}
          <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-white/5" />

          <div className="relative mx-auto max-w-2xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4 }}
              className="text-xs font-semibold uppercase tracking-widest text-white/80"
            >
              Stay Updated
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-2 text-2xl font-bold text-white sm:text-3xl md:text-4xl"
            >
              Get Free Learning Tips & Offers
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base"
            >
              Join 20,000+ learners who receive our weekly newsletter with curated courses, career tips, and exclusive discounts from {BRAND.name}.
            </motion.p>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 flex flex-col items-center gap-2"
                >
                  <CheckCircle2 className="size-10 text-green-300" />
                  <p className="font-semibold text-white">You&apos;re in!</p>
                  <p className="text-sm text-white/70">Check your inbox for a welcome coupon.</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{}}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  onSubmit={handleSubmit}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    id="subscribe-email"
                    className="flex-1 max-w-md rounded-lg bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-white/40 shadow-sm"
                  />
                  <Button
                    type="submit"
                    disabled={subscribe.isPending}
                    className="gap-2 shrink-0 rounded-lg bg-white px-6 h-11 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
                  >
                    {subscribe.isPending ? "Subscribing..." : "Subscribe"}
                    {!subscribe.isPending && <ArrowRight className="size-4" />}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-3 text-xs text-white/50"
            >
              No spam, ever. Unsubscribe at any time.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
