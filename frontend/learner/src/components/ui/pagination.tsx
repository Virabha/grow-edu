"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center gap-2", className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={prevDisabled}
        aria-label="Previous page"
      >
        Previous
      </Button>
      <span className="text-muted-foreground text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={nextDisabled}
        aria-label="Next page"
      >
        Next
      </Button>
    </nav>
  );
}

export { Pagination };
