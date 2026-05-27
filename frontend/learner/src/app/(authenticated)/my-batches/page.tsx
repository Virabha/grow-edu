"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, GraduationCap } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureImage } from "@/components/ui/secure-image";
import { cn } from "@/lib/utils";
import { useMyBatches } from "@/lib/hooks/use-batches";
import type { MyBatch } from "@/lib/api/services/batches";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyBatchesPage() {
  const router = useRouter();
  const { data: batches = [], isLoading } = useMyBatches();

  return (
    <PageLayout
      header="My Batches"
      description="Your enrolled cohorts — live classes, recordings, and announcements."
    >
      {isLoading ? (
        <CardGridSkeleton />
      ) : batches.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any batches yet"
          description="Browse upcoming batches or contact your admin for access."
          icon={<GraduationCap className="h-12 w-12" />}
          action={{ label: "Browse batches", onClick: () => router.push("/batches") }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {batches.map((b) => (
            <MyBatchCard key={b.batchId} batch={b} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}

function MyBatchCard({ batch }: { batch: MyBatch }) {
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

        <div className="mt-auto border-t border-border/60 pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-primary">
            Enter batch →
          </span>
        </div>
      </div>
    </Link>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
