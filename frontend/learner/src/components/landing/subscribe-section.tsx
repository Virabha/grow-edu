"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { useSubscribe } from "@/lib/hooks/use-contact";
import { toast } from "sonner";
import { getApiError } from "@/lib/api/errors";

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
        onError: (err) => {
          toast.error(getApiError(err, "Failed to subscribe. Please try again.").message);
        },
      },
    );
  };

  return (
    <section className="bg-background py-20 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground text-background">
          <div className="absolute inset-0 opacity-30">
            <Image
              src="/images/landing/books.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-foreground via-foreground/85 to-foreground/40" />
          </div>
          <div className="pointer-events-none absolute -top-24 right-1/4 size-[300px] rounded-full bg-primary/25 blur-3xl" />

          <div className="relative grid items-center gap-8 px-7 py-14 sm:px-12 md:grid-cols-2 md:py-16">
            <div>
              <p className="font-display text-xs italic tracking-wide text-background/70">
                Stay in the loop
              </p>
              <h2 className="font-display mt-3 text-3xl font-medium leading-tight sm:text-4xl md:text-5xl">
                A weekly note on learning,{" "}
                <em className="text-primary">worth opening.</em>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-background/75">
                Join 20,000+ readers who get curated courses, career stories
                and exclusive early-access discounts from {BRAND.name}.
              </p>
            </div>

            <div>
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-6"
                  >
                    <CheckCircle2 className="size-8 text-emerald-300" />
                    <p className="font-display text-xl font-medium">
                      You&apos;re in.
                    </p>
                    <p className="text-sm text-background/70">
                      Check your inbox for a welcome coupon.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3"
                  >
                    <label
                      htmlFor="subscribe-email"
                      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-background/55"
                    >
                      Your email
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@somewhere.com"
                        id="subscribe-email"
                        className="flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-background outline-none transition-all placeholder:text-background/45 focus:border-primary/60 focus:bg-white/15"
                      />
                      <Button
                        type="submit"
                        size="lg"
                        disabled={subscribe.isPending}
                        className="h-12 gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-all hover:bg-primary/90"
                      >
                        {subscribe.isPending ? "Subscribing..." : "Subscribe"}
                        {!subscribe.isPending && (
                          <ArrowUpRight className="size-4" />
                        )}
                      </Button>
                    </div>
                    <p className="mt-1 text-[11px] text-background/45">
                      No spam, ever. Unsubscribe at any time.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
