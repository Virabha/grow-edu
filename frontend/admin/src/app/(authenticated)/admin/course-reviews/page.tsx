"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Star, X } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/admin/status-pill";
import {
  useResourceAction,
  useResourceList,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CourseReviewsPage() {
  const [status, setStatus] = React.useState("PENDING");

  const { data, isLoading, isError, error, refetch } = useResourceList(
    "course-reviews",
    { status, limit: 25 },
  );
  const approve = useResourceAction("course-reviews", "approve");
  const reject = useResourceAction("course-reviews", "reject");

  const rows = data?.data ?? [];

  function act(row: ResourceRow, action: "approve" | "reject") {
    const mutation = action === "approve" ? approve : reject;
    mutation.mutate(
      { id: String(row.id) },
      {
        onSuccess: () =>
          toast.success(
            action === "approve" ? "Review published" : "Review rejected",
          ),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not update the review",
          ),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Moderation"
      header="Course reviews"
      description="Learner reviews waiting on a decision before they appear publicly."
      filters={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[190px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Awaiting moderation</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="all">All reviews</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isError ? (
        <EmptyState
          title="We could not load reviews"
          description={error instanceof Error ? error.message : "Please try again."}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            status === "PENDING" ? "Nothing waiting" : "No reviews match that filter"
          }
          description={
            status === "PENDING"
              ? "Every review has been moderated. New ones will land here."
              : "Try a different status."
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={String(row.id)}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={Number(row.rating ?? 0)} />
                    <span className="text-sm font-medium">
                      {String(row.title ?? "")}
                    </span>
                    <StatusPill value={String(row.status ?? "")} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {String(row.userName ?? "")} on{" "}
                    <span className="font-medium text-foreground">
                      {String(row.courseTitle ?? "")}
                    </span>{" "}
                    · {formatDate(String(row.createdAt ?? ""))}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {String(row.body ?? "")}
                  </p>
                </div>

                {row.status === "PENDING" && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => act(row, "approve")}
                      disabled={approve.isPending}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Publish
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => act(row, "reject")}
                      disabled={reject.isPending}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5",
            star <= value
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground/35",
          )}
        />
      ))}
      <span className="sr-only">{value} out of 5</span>
    </span>
  );
}
