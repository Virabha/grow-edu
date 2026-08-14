"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

interface StarRatingProps {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
  /** Screen-reader text; defaults to "N out of 5". */
  label?: string;
}

/** Read-only rating. */
function StarRating({ value, size = "sm", className, label }: StarRatingProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(
            SIZES[size],
            star <= value
              ? "fill-[var(--brass)] text-[var(--brass)]"
              : "text-muted-foreground/35",
          )}
        />
      ))}
      <span className="sr-only">{label ?? `${value} out of 5`}</span>
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: keyof typeof SIZES;
  className?: string;
  name?: string;
}

const RATING_WORD = [
  "",
  "Poor",
  "Fair",
  "Good",
  "Very good",
  "Excellent",
] as const;

/**
 * Editable rating.
 *
 * Built as a real radio group so arrow keys move between stars and the choice
 * survives a form reset — a row of buttons would do neither.
 */
function StarRatingInput({
  value,
  onChange,
  size = "lg",
  className,
  name = "rating",
}: StarRatingInputProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div role="radiogroup" aria-label="Rating" className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className="cursor-pointer p-0.5"
            title={RATING_WORD[star]}
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="peer sr-only"
            />
            <Star
              aria-hidden="true"
              className={cn(
                SIZES[size],
                "transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                star <= value
                  ? "fill-[var(--brass)] text-[var(--brass)]"
                  : "text-muted-foreground/35 hover:text-[var(--brass)]",
              )}
            />
            <span className="sr-only">
              {star} star{star === 1 ? "" : "s"} — {RATING_WORD[star]}
            </span>
          </label>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {value > 0 ? RATING_WORD[value] : "Choose a rating"}
      </span>
    </div>
  );
}

export { StarRating, StarRatingInput };
