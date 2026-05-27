"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarDays, GraduationCap, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecureImage } from "@/components/ui/secure-image";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useBatches } from "@/lib/hooks/use-batches";
import type { Batch, BatchStatus } from "@/lib/api/services/batches";

const STATUS_FILTERS: { label: string; value: BatchStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Ongoing", value: "ONGOING" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BatchesCatalogPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BatchStatus | "all">("all");
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching } = useBatches({
    search: debouncedSearch.trim() || undefined,
    status: status === "all" ? undefined : status,
    limit: 30,
  });
  const batches = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const hasFilters = !!debouncedSearch.trim() || status !== "all";

  function resetFilters() {
    setSearch("");
    setStatus("all");
  }

  return (
    <>
      <section className="relative overflow-hidden bg-foreground py-10 text-background sm:py-14">
        <Image
          src="/images/landing/classroom-2.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/65 to-foreground/45" />
        <div className="absolute inset-0 bg-primary/15 mix-blend-multiply" />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/70">
              <span className="inline-block h-px w-6 bg-background/30" />
              Live cohorts
              <span className="inline-block h-px w-6 bg-background/30" />
            </p>
            <h1 className="font-display mt-3 text-3xl font-medium leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
              Learn live with{" "}
              <em className="text-primary">a cohort.</em>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-background/80 sm:text-base">
              Scheduled live classes, recordings, daily practice, and instructor
              doubt support — all in one batch.
            </p>

            <form
              className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-full border border-white/20 bg-white/95 p-1.5 pl-4 shadow-lg backdrop-blur"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batches, target exams…"
                aria-label="Search batches"
                className="h-9 flex-1 border-0 bg-transparent px-1 text-sm text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-2.5">
            {STATUS_FILTERS.map((f) => {
              const active = status === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-display text-base text-foreground">
                {total}
              </span>{" "}
              batch{total === 1 ? "" : "es"}
              {debouncedSearch.trim() && (
                <span>
                  {" "}
                  matching{" "}
                  <span className="text-foreground">
                    &ldquo;{debouncedSearch.trim()}&rdquo;
                  </span>
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as BatchStatus | "all")}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <CardGridSkeleton />
          ) : batches.length > 0 ? (
            <div
              className={cn(
                "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                isFetching && "opacity-70 transition-opacity",
              )}
            >
              {batches.map((b) => (
                <BatchCard key={b.batchId} batch={b} />
              ))}
            </div>
          ) : (
            <EmptyState onReset={resetFilters} hasFilters={hasFilters} />
          )}
        </div>
      </section>
    </>
  );
}

function BatchCard({ batch }: { batch: Batch }) {
  const compareAt = batch.compareAtPrice;
  const discount =
    compareAt && compareAt > batch.price
      ? Math.round(((compareAt - batch.price) / compareAt) * 100)
      : null;

  return (
    <Link
      href={`/batches/${batch.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {batch.thumbnail ? (
          <SecureImage
            src={batch.thumbnail}
            alt={batch.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <GraduationCap className="size-8 text-muted-foreground/30" />
          </div>
        )}
        {discount !== null && discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
            −{discount}%
          </span>
        )}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            batch.status === "ONGOING" && "bg-emerald-500/95 text-white",
            batch.status === "UPCOMING" && "bg-amber-500/95 text-white",
            (batch.status === "COMPLETED" || batch.status === "ARCHIVED") &&
              "bg-zinc-500/95 text-white",
          )}
        >
          {batch.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {batch.targetExam && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {batch.targetExam}
          </p>
        )}
        <h3 className="font-display line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {batch.title}
        </h3>
        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <CalendarDays className="size-3 shrink-0" />
          {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
        </p>

        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-border/60 pt-2">
          <div className="flex items-baseline gap-1.5">
            {batch.price === 0 ? (
              <span className="font-display text-base font-medium text-emerald-600">
                Free
              </span>
            ) : (
              <>
                <span className="font-display text-base font-medium text-foreground">
                  {batch.currency} {batch.price.toFixed(0)}
                </span>
                {compareAt && compareAt > batch.price && (
                  <span className="text-[11px] text-muted-foreground line-through">
                    {batch.currency} {compareAt.toFixed(0)}
                  </span>
                )}
              </>
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-primary">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
    >
      <div className="grid size-16 place-items-center rounded-full bg-muted">
        <GraduationCap className="size-7 text-muted-foreground/50" />
      </div>
      <p className="font-display text-lg font-medium">No batches found.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "New cohorts will be announced here — check back soon."}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onReset} className="mt-2">
          Clear filters
        </Button>
      )}
    </motion.div>
  );
}
