import { cn } from "@/lib/utils";

const TONES = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  grey: "bg-muted text-muted-foreground",
} as const;

type Tone = keyof typeof TONES;

/** Status vocabulary shared across the admin tables. */
const KNOWN: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "amber" },
  PENDING_REVIEW: { label: "Pending review", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "amber" },
  PUBLISHED: { label: "Published", tone: "green" },
  DRAFT: { label: "Draft", tone: "grey" },
  ARCHIVED: { label: "Archived", tone: "grey" },
  ACTIVE: { label: "Active", tone: "green" },
  COMPLETED: { label: "Completed", tone: "green" },
  REVOKED: { label: "Revoked", tone: "red" },
  FAILED: { label: "Failed", tone: "red" },
  REFUNDED: { label: "Refunded", tone: "grey" },
  PROOF_UPLOADED: { label: "Under review", tone: "blue" },
  NEW: { label: "New", tone: "blue" },
  READ: { label: "Read", tone: "grey" },
  REPLIED: { label: "Replied", tone: "green" },
  SCHEDULED: { label: "Scheduled", tone: "blue" },
  LIVE: { label: "Live", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
  VERIFIED: { label: "Verified", tone: "green" },
  NOT_STARTED: { label: "Not started", tone: "grey" },
  SUBMITTED: { label: "Submitted", tone: "amber" },
};

export function StatusPill({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  // Values arrive from the API — anything unmapped renders neutrally rather
  // than crashing the table.
  const entry = KNOWN[value];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
        TONES[entry?.tone ?? "grey"],
        className,
      )}
    >
      {entry?.label ?? value.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
