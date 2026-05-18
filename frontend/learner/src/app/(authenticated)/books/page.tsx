"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  BookOpen,
  ChevronDown,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { useBooks } from "@/lib/hooks/use-books";
import { useCategories } from "@/lib/hooks/use-categories";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Book } from "@/lib/api/services/books";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
  { label: "A → Z", value: "title-asc" },
];

function sortBooks(data: Book[], sortKey: string): Book[] {
  const sorted = [...data];
  switch (sortKey) {
    case "price-asc":
      return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    case "price-desc":
      return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

function BooksContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") ?? undefined;
  const urlSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(urlSearch);
  const [categoryId, setCategoryId] = useState<string | undefined>(urlCategory);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const { data: categories } = useCategories();
  const { data: booksData, isLoading } = useBooks({
    categoryId,
    search: debouncedSearch || undefined,
    page,
    limit: 12,
  });

  const rawBooks = booksData?.data ?? [];
  const pagination = booksData?.pagination;

  const booksResult = useMemo(() => sortBooks(rawBooks, sort), [rawBooks, sort]);

  function handleClearFilters() {
    setSearch("");
    setCategoryId(undefined);
    setSort("newest");
    setPage(1);
  }

  function handleCategoryChange(id: string | undefined) {
    setCategoryId(id);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasFilters = !!categoryId || !!search;
  const selectedCategory = categories?.find((c) => c.categoryId === categoryId);
  const parentCategories = categories?.filter((c) => !c.parentCategoryId) ?? [];

  return (
    <>
      <section className="relative">
        <div className="mx-auto bg-[#000052] py-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-3 py-1 text-3xl font-semibold text-white">
              Our Books Collection
            </span>
            <h1 className="mt-3 text-3xl text-white tracking-tight sm:text-4xl md:text-5xl">
              Explore Our Books
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white md:text-base">
              Discover curated books to deepen your knowledge and accelerate
              learning.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            <button
              onClick={() => handleCategoryChange(undefined)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                !categoryId
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border/60 bg-white/40 backdrop-blur-sm text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              All
            </button>
            {parentCategories.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() =>
                  handleCategoryChange(
                    categoryId === cat.categoryId ? undefined : cat.categoryId,
                  )
                }
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                  categoryId === cat.categoryId
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border/60 bg-white/40 backdrop-blur-sm text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {pagination?.total ?? 0}
                </strong>{" "}
                books
                {selectedCategory && (
                  <span className="ml-1">
                    {" "}
                    in{" "}
                    <span className="font-medium text-primary">
                      {selectedCategory.name}
                    </span>
                  </span>
                )}
              </p>
              {isLoading && (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground/70 hover:text-primary text-xs h-8"
                >
                  <X className="mr-1 size-3" /> Clear
                </Button>
              )}
              <div className="relative">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setSortOpen(!sortOpen)}
                  className="gap-1.5 h-8 text-xs"
                >
                  <SlidersHorizontal className="size-3" />{" "}
                  {SORT_OPTIONS.find((s) => s.value === sort)?.label}
                  <ChevronDown className="size-3" />
                </Button>
                <AnimatePresence>
                  {sortOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setSortOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-border/60 bg-white/80 p-1 shadow-lg backdrop-blur-xl"
                      >
                        {SORT_OPTIONS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => {
                              setSort(s.value);
                              setSortOpen(false);
                              setPage(1);
                            }}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left text-xs transition-all",
                              sort === s.value
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : booksResult.length > 0 ? (
            <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {booksResult.map((book, i) => (
                <motion.div
                  key={book.bookId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(i * 0.03, 0.4),
                  }}
                >
                  <Link
                    href={`/books/${book.slug}`}
                    className="group block"
                  >
                    <div className="rounded-xl p-[1.5px] bg-transparent transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary/60 group-hover:via-violet-500/50 group-hover:to-primary/60 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary/10">
                      <div className="rounded-[10px] overflow-hidden bg-white/50 backdrop-blur-md border border-border/60 group-hover:border-transparent">
                        <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-primary/10 to-violet-500/5">
                          {book.coverImage ? (
                            <Image
                              src={book.coverImage}
                              alt={book.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="size-10 text-primary/25" />
                            </div>
                          )}
                          {book.format && (
                            <span className="absolute top-1.5 right-1.5 rounded-full bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                              {book.format}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          <h3 className="line-clamp-2 text-xs font-bold leading-snug transition-colors group-hover:text-primary">
                            {book.title}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/70 truncate">
                            <User className="size-2.5 shrink-0" />
                            {book.author}
                          </p>
                          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
                            <div className="flex items-baseline gap-1">
                              {parseFloat(book.price) === 0 ? (
                                <span className="text-xs font-bold text-green-600">Free</span>
                              ) : (
                                <>
                                  <span className="text-xs font-bold">
                                    ₹{parseFloat(book.price).toFixed(0)}
                                  </span>
                                  {book.compareAtPrice && (
                                    <span className="text-[10px] text-muted-foreground/50 line-through">
                                      ₹{parseFloat(book.compareAtPrice).toFixed(0)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                              View
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
            >
              <div className="flex size-20 items-center justify-center rounded-full bg-muted/30">
                <Search className="size-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold">No books found</p>
              <p className="max-w-sm text-sm text-muted-foreground/70">
                Try adjusting your search or filters.
              </p>
              <Button
                size="sm"
                variant="glass"
                onClick={handleClearFilters}
                className="mt-2"
              >
                Reset All Filters
              </Button>
            </motion.div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function BooksPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <BooksContent />
    </Suspense>
  );
}
