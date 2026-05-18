"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFaqs } from "@/lib/hooks/use-cms";

export function FaqSection() {
  const { data: faqs = [], isLoading } = useFaqs();
  const [open, setOpen] = useState<number | null>(faqs.length ? 0 : null);

  if (isLoading) {
    return (
      <section className="py-8 md:py-10 bg-white/10 backdrop-blur-[2px]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
            <h2 className="section-heading mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
              Have Questions? We&apos;ve Got Answers
            </h2>
          </div>
          <div className="mx-auto max-w-2xl space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!faqs.length) return null;

  return (
    <section className="py-8 md:py-10 bg-white/10 backdrop-blur-[2px]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="section-heading mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
            Have Questions? We&apos;ve Got Answers
          </h2>
        </div>

        <div className="mx-auto max-w-2xl divide-y divide-border rounded-2xl border border-border/80 bg-white/50 backdrop-blur-sm overflow-hidden">
          {faqs.map((faq, i) => (
            <div key={faq.faqId}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                aria-expanded={open === i}
              >
                <span className={cn("text-sm font-semibold transition-colors", open === i ? "text-primary" : "text-foreground")}>
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open === i && "rotate-180 text-primary")}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
