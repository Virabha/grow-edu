"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { useCategories } from "@/lib/hooks/use-categories";

export function CategoriesSection() {
  const { data: categories = [], isLoading } = useCategories();

  const parentCategories = categories.filter((c) => !c.parentCategoryId);

  return (
    <section
      className="py-12 md:py-10 bg-white"
      aria-labelledby="categories-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Browse Categories
            </p>
            <h2
              id="categories-heading"
              className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl"
            >
              Our Best Categories
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore our wide range of courses across different domains
            </p>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See all <ArrowRight className="size-3.5" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {parentCategories.map((cat, i) => (
              <motion.div
                key={cat.categoryId}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{}}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Link
                  href={`/courses?category=${cat.categoryId}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-2 hover:scale-[1.03]"
                >
                  <div className="relative flex h-44 sm:h-48 items-center justify-center overflow-hidden bg-muted">
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <BookOpen className="size-12 text-primary/40 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="line-clamp-1 text-sm font-bold text-foreground leading-snug transition-colors duration-200 group-hover:text-primary sm:text-base">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {(cat as { coursesCount?: number }).coursesCount ?? 0}{" "}
                        courses
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10 flex justify-center"
        >
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary hover:text-white hover:shadow-lg"
          >
            VIEW ALL CATEGORIES
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
