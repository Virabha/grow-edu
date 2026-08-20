"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useCategories } from "@/lib/hooks/use-categories";

export function CategoriesSection() {
  const { data: categories = [], isLoading } = useCategories();
  const parentCategories = categories.filter((c) => !c.parentCategoryId);

  return (
    <section
      className="bg-background py-20 md:py-24"
      aria-labelledby="categories-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-base italic text-primary">
                01
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              Programmes of study
            </div>
            <h2
              id="categories-heading"
              className="font-display mt-4 text-3xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl"
            >
              Pick the discipline that <em className="text-primary">moves</em>{" "}
              you.
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              From foundational academics to advanced executive AI programs —
              every track is built around real outcomes.
            </p>
          </div>
          <Link
            href="/batches"
            className="group inline-flex shrink-0 items-center gap-2 self-start border-b border-foreground pb-1 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:self-end"
          >
            Browse the catalogue
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {parentCategories.map((cat, i) => (
              <motion.div
                key={cat.categoryId}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Link
                  href={`/courses?category=${cat.categoryId}`}
                  className="group relative flex h-full flex-col bg-card transition-colors hover:bg-muted/40"
                >
                  <div className="relative aspect-[5/4] overflow-hidden">
                    {cat.imageUrl ? (
                      <Image
                        src={cat.imageUrl}
                        alt={cat.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized={cat.imageUrl.startsWith("http")}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                        <BookOpen className="size-14 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent" />
                    <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground backdrop-blur-md">
                      <span className="font-display italic text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      Programme
                    </span>
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-4 px-6 py-5">
                    <div className="min-w-0">
                      <h3 className="font-display line-clamp-1 text-xl font-medium leading-tight text-foreground transition-colors group-hover:text-primary">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {cat.description}
                        </p>
                      )}
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {(cat as { coursesCount?: number }).coursesCount ?? 0}{" "}
                        courses
                      </p>
                    </div>
                    <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
