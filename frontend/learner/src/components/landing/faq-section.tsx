"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFaqs } from "@/lib/hooks/use-cms";

const fallbackFaqs = [
  {
    faqId: "f1",
    question: "How do live cohorts work?",
    answer:
      "Cohorts run on a fixed calendar with weekly live sessions, doubt clinics, and graded assignments. You join a small batch — typically 30–60 learners — and progress together. Recordings are available for life.",
  },
  {
    faqId: "f2",
    question: "Can I learn at my own pace instead?",
    answer:
      "Yes. Most programmes offer a self-paced track with the same content, assessments, and certificate — minus the live calendar. You can switch tracks within the first two weeks.",
  },
  {
    faqId: "f3",
    question: "Are the certificates recognised?",
    answer:
      "Our certificates are issued after rigorous, graded assessments — not just course completion. Recruiters can verify any certificate via a unique URL. They carry weight because they signal real, measured ability.",
  },
  {
    faqId: "f4",
    question: "What if I'm not satisfied?",
    answer:
      "Every paid course has a 7-day money-back guarantee — no questions, no friction. After that, you keep lifetime access to whatever you've enrolled in.",
  },
];

export function FaqSection() {
  const { data: cmsFaqs = [], isLoading } = useFaqs();
  const faqs = cmsFaqs.length > 0 ? cmsFaqs : fallbackFaqs;
  const [open, setOpen] = useState<number | null>(0);

  if (isLoading) {
    return (
      <section className="bg-muted/30 py-20 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="bg-muted/30 py-20 md:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-base italic text-primary">
              07
            </span>
            <span className="inline-block h-px w-8 bg-border" />
            Questions, answered
            <span className="inline-block h-px w-8 bg-border" />
          </div>
          <h2
            id="faq-heading"
            className="font-display mt-5 text-3xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            The honest <em className="text-primary">answers.</em>
          </h2>
        </motion.div>

        <div className="mx-auto max-w-3xl">
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card">
            {faqs.map((faq, i) => (
              <div key={faq.faqId}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={open === i}
                >
                  <span
                    className={cn(
                      "font-display text-lg font-medium leading-snug transition-colors sm:text-xl",
                      open === i ? "text-primary" : "text-foreground",
                    )}
                  >
                    {faq.question}
                  </span>
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition-all",
                      open === i
                        ? "rotate-45 border-primary bg-primary text-primary-foreground"
                        : "text-foreground hover:border-primary/40",
                    )}
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-[15px] leading-relaxed text-muted-foreground">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
