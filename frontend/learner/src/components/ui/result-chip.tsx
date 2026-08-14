import { cn } from "@/lib/utils";

interface ResultChipProps {
  passed: boolean;
  /** Overrides the default "Failed" label, e.g. "Below 60% pass mark". */
  failLabel?: string;
  className?: string;
}

/** Pass/fail badge for a quiz attempt. Shared by the dashboard and the list. */
function ResultChip({ passed, failLabel, className }: ResultChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
        passed
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
        className,
      )}
    >
      {passed ? "Passed" : (failLabel ?? "Failed")}
    </span>
  );
}

export { ResultChip };
