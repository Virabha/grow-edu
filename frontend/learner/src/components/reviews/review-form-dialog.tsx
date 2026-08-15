"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getApiError } from "@/lib/api/errors";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRatingInput } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateReview,
  useUpdateReview,
  type Review,
} from "@/lib/hooks/use-reviews";

export interface ReviewTarget {
  courseId: string;
  courseTitle: string;
  review?: Review;
}

const MIN_BODY = 20;
const MAX_BODY = 1200;

export function ReviewFormDialog({
  target,
  open,
  onOpenChange,
}: {
  target: ReviewTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!target) return null;

  return (
    <ReviewForm
      key={`${target.courseId}:${target.review?.reviewId ?? "new"}`}
      target={target}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

function ReviewForm({
  target,
  open,
  onOpenChange,
}: {
  target: ReviewTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rating, setRating] = useState(target.review?.rating ?? 0);
  const [title, setTitle] = useState(target.review?.title ?? "");
  const [body, setBody] = useState(target.review?.body ?? "");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const isEditing = !!target.review;
  const pending = createReview.isPending || updateReview.isPending;

  const ratingError = touched && rating === 0 ? "Choose a rating" : undefined;
  const titleError =
    touched && title.trim().length === 0 ? "Give your review a headline" : undefined;
  const bodyError =
    touched && body.trim().length < MIN_BODY
      ? `Write at least ${MIN_BODY} characters`
      : undefined;

  const displayRatingError = ratingError ?? serverFieldErrors["rating"];
  const displayTitleError = titleError ?? serverFieldErrors["title"];
  const displayBodyError = bodyError ?? serverFieldErrors["body"];

  const valid = rating > 0 && title.trim() && body.trim().length >= MIN_BODY;

  function clearServerErrors() {
    setServerError(null);
    setServerFieldErrors({});
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    clearServerErrors();
    if (!valid) return;

    const done = {
      onSuccess: () => {
        toast.success(
          isEditing
            ? "Review updated. It goes back to a moderator before it appears."
            : "Review submitted. It will appear once a moderator approves it.",
        );
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const apiError = getApiError(err, "Could not save your review");
        setServerError(apiError.message);
        setServerFieldErrors(apiError.fieldErrors);
        toast.error(apiError.message);
      },
    };

    if (isEditing && target.review) {
      updateReview.mutate(
        {
          reviewId: target.review.reviewId,
          rating,
          title: title.trim(),
          body: body.trim(),
        },
        done,
      );
    } else {
      createReview.mutate(
        {
          courseId: target.courseId,
          rating,
          title: title.trim(),
          body: body.trim(),
        },
        done,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
      <form onSubmit={submit}>
        <DialogHeader className="border-b border-border/60">
          <DialogTitle className="font-display text-lg font-medium">
            {isEditing ? "Edit your review" : "Write a review"}
          </DialogTitle>
          <DialogDescription>{target.courseTitle}</DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4 pt-3">
          {serverError && !Object.keys(serverFieldErrors).length && (
            <p className="text-xs text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>How would you rate it?</Label>
            <StarRatingInput
              value={rating}
              onChange={(r) => {
                setRating(r);
                clearServerErrors();
              }}
            />
            {displayRatingError && (
              <p className="text-xs text-destructive" role="alert">
                {displayRatingError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-title">Headline</Label>
            <Input
              id="review-title"
              value={title}
              maxLength={120}
              onChange={(e) => {
                setTitle(e.target.value);
                clearServerErrors();
              }}
              placeholder="Sum up your experience in one line"
              aria-invalid={!!displayTitleError}
            />
            {displayTitleError && (
              <p className="text-xs text-destructive" role="alert">
                {displayTitleError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-body">Your review</Label>
            <Textarea
              id="review-body"
              rows={5}
              value={body}
              maxLength={MAX_BODY}
              onChange={(e) => {
                setBody(e.target.value);
                clearServerErrors();
              }}
              placeholder="What worked, what did not, and who this course suits."
              aria-invalid={!!displayBodyError}
            />
            <div className="flex items-center justify-between">
              {displayBodyError ? (
                <p className="text-xs text-destructive" role="alert">
                  {displayBodyError}
                </p>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Be specific — it helps the next learner decide.
                </span>
              )}
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {body.length}/{MAX_BODY}
              </span>
            </div>
          </div>
        </DialogContent>

        <DialogFooter className="gap-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Submit review"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
