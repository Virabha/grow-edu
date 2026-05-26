"use client";

import Link from "next/link";
import { useState } from "react";
import { GraduationCap, CalendarDays, Search } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureImage } from "@/components/ui/secure-image";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useBatches } from "@/lib/hooks/use-batches";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BatchesCatalogPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useBatches({
    search: search || undefined,
    limit: 30,
  });
  const batches = data?.data ?? [];

  return (
    <PageLayout
      subtitle="Explore"
      header="Live batches"
      description="Cohort-based programs with live classes, recordings, and dedicated study materials."
      className="space-y-4"
    >
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search batches, target exams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-8 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          title="No batches available"
          description="Check back soon for upcoming cohorts."
          icon={<GraduationCap className="h-12 w-12" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Link
              key={b.batchId}
              href={`/batches/${b.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-video w-full bg-muted">
                {b.thumbnail ? (
                  <SecureImage
                    src={b.thumbnail}
                    alt={b.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <GraduationCap className="size-12 text-muted-foreground" />
                  </div>
                )}
                <Badge
                  className="absolute left-3 top-3"
                  variant={b.status === "ONGOING" ? "default" : "secondary"}
                >
                  {b.status}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-medium line-clamp-1">
                  {b.title}
                </h3>
                {b.targetExam && (
                  <p className="mt-0.5 text-xs font-medium text-primary">{b.targetExam}</p>
                )}
                {b.shortDescription && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {b.shortDescription}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  {b.price === 0 ? (
                    <span className="font-display text-base font-semibold text-emerald-600">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="font-display text-base font-semibold">
                        {b.currency} {b.price.toFixed(0)}
                      </span>
                      {b.compareAtPrice && b.compareAtPrice > b.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {b.currency} {b.compareAtPrice.toFixed(0)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
