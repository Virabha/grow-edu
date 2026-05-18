"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
    showPageNumbers?: boolean;
}
export function Pagination({ currentPage, totalPages, onPageChange, className, showPageNumbers = true, }: PaginationProps) {
    if (totalPages <= 1)
        return null;
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        }
        else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push("ellipsis");
                pages.push(totalPages);
            }
            else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push("ellipsis");
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            }
            else {
                pages.push(1);
                pages.push("ellipsis");
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push("ellipsis");
                pages.push(totalPages);
            }
        }
        return pages;
    };
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };
    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };
    return (<div className={cn("flex items-center justify-center gap-2", className)}>
      <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentPage === 1} className="gap-1">
        <ChevronLeft className="h-4 w-4"/>
        Previous
      </Button>

      {showPageNumbers && (<div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
                if (page === "ellipsis") {
                    return (<span key={`ellipsis-${index}`} className="px-2 py-1 text-muted-foreground">
                  ...
                </span>);
                }
                const pageNum = page as number;
                return (<Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => onPageChange(pageNum)} className="min-w-[40px]">
                {pageNum}
              </Button>);
            })}
        </div>)}

      <Button variant="outline" size="sm" onClick={handleNext} disabled={currentPage === totalPages} className="gap-1">
        Next
        <ChevronRight className="h-4 w-4"/>
      </Button>

      <span className="text-sm text-muted-foreground ml-4">
        Page {currentPage} of {totalPages}
      </span>
    </div>);
}
