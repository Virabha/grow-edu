"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageSquareQuote, PenLine, Star, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import {
  ReviewFormDialog,
  type ReviewTarget,
} from "@/components/reviews/review-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SecureImage } from "@/components/ui/secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteReview,
  useMyReviews,
  useReviewableCourses,
  type Review,
} from "@/lib/hooks/use-reviews";
import { formatDate } from "@/lib/format";

export default function ReviewsPage() {
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);

  const reviews = useMyReviews({ page: 1, limit: 20 });
  const reviewable = useReviewableCourses();
  const deleteReview = useDeleteReview();

  const myReviews = reviews.data?.data ?? [];
  const awaiting = reviewable.data ?? [];

  function openForm(next: ReviewTarget) {
    setTarget(next);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteReview.mutate(pendingDelete.reviewId, {
      onSuccess: () => {
        toast.success("Review deleted");
        setPendingDelete(null);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not delete the review",
        ),
    });
  }

  return (
    <PageLayout
      subtitle="Your feedback"
      header="Reviews"
      description="What you have said about your courses, and which ones are still waiting to hear from you."
    >
      <Tabs defaultValue="written">
        <TabsList>
          <TabsTrigger value="written">
            Written ({myReviews.length})
          </TabsTrigger>
          <TabsTrigger value="awaiting">
            Awaiting review ({awaiting.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="written" className="mt-3">
          {reviews.isError ? (
            <EmptyState
              title="We could not load your reviews"
              description={
                reviews.error instanceof Error
                  ? reviews.error.message
                  : "Please try again."
              }
              icon={<MessageSquareQuote className="size-10" />}
              action={{ label: "Try again", onClick: () => void reviews.refetch() }}
            />
          ) : reviews.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : myReviews.length === 0 ? (
            <EmptyState
              title="You have not written a review yet"
              description="Once you have spent time in a course, your review helps the next learner decide."
              icon={<Star className="size-10" />}
            />
          ) : (
            <ul className="space-y-2">
              {myReviews.map((review) => (
                <li key={review.reviewId}>
                  <Card className="py-3">
                    <CardContent className="space-y-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          <SecureImage
                            src={review.courseThumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <Link
                            href={`/courses/${review.courseId}`}
                            className="block truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {review.courseTitle}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <StarRating value={review.rating} />
                            <h3 className="text-sm font-medium">
                              {review.title}
                            </h3>
                            {review.status === "PENDING" && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                Awaiting approval
                              </span>
                            )}
                            {review.status === "REJECTED" && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                Not approved
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {review.body}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {review.updatedAt
                              ? `Edited ${formatDate(review.updatedAt)}`
                              : `Posted ${formatDate(review.createdAt)}`}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() =>
                              openForm({
                                courseId: review.courseId,
                                courseTitle: review.courseTitle,
                                review,
                              })
                            }
                          >
                            <PenLine className="mr-1 size-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label={`Delete your review of ${review.courseTitle}`}
                            onClick={() => setPendingDelete(review)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {review.instructorReply && (
                        <div className="ml-0 rounded-lg border-l-2 border-[var(--brass)] bg-muted/40 px-3 py-2 sm:ml-[92px]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Reply from the instructor
                          </p>
                          <p className="mt-0.5 text-sm">
                            {review.instructorReply}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="awaiting" className="mt-3">
          {reviewable.isLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : awaiting.length === 0 ? (
            <EmptyState
              title="You have reviewed everything"
              description="Every course you are enrolled in already has your review. Thank you."
              icon={<MessageSquareQuote className="size-10" />}
            />
          ) : (
            <ul className="grid gap-2 [&>*]:min-w-0 sm:grid-cols-2">
              {awaiting.map((course) => (
                <li key={course.courseId}>
                  <Card className="h-full py-3">
                    <CardContent className="flex h-full items-center gap-3">
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                        <SecureImage
                          src={course.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="truncate text-sm font-medium">
                          {course.title}
                        </h3>
                        <ProgressBar
                          value={course.progressPercent}
                          label={`${course.title} progress`}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          {course.progressPercent}% complete
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 shrink-0 text-xs"
                        onClick={() =>
                          openForm({
                            courseId: course.courseId,
                            courseTitle: course.title,
                          })
                        }
                      >
                        Write review
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ReviewFormDialog
        target={target}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">
            Delete this review?
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted-foreground">
            Your review of{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.courseTitle}
            </span>{" "}
            will be removed. You can write a new one later.
          </p>
        </DialogContent>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPendingDelete(null)}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={confirmDelete}
            disabled={deleteReview.isPending}
          >
            {deleteReview.isPending ? "Deleting…" : "Delete review"}
          </Button>
        </DialogFooter>
      </Dialog>
    </PageLayout>
  );
}
