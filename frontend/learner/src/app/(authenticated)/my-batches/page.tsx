"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, CalendarDays, ArrowRight } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureImage } from "@/components/ui/secure-image";
import { Badge } from "@/components/ui/badge";
import { useMyBatches } from "@/lib/hooks/use-batches";

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
      className="space-y-4"
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any batches yet"
          description="Browse upcoming batches or contact your admin for access."
          icon={<GraduationCap className="h-12 w-12" />}
          action={{ label: "Browse batches", onClick: () => router.push("/batches") }}
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
                  variant={
                    b.status === "ONGOING"
                      ? "default"
                      : b.status === "UPCOMING"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {b.status}
                </Badge>
              </div>
              <div className="p-4">
                <h3 className="font-display text-base font-medium line-clamp-1">
                  {b.title}
                </h3>
                {b.shortDescription && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {b.shortDescription}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Enter batch <ArrowRight className="size-3" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
