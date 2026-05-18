"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface CourseCarouselSkeletonProps {
  title: string;
  className?: string;
}

function CourseCarouselSkeleton({ title, className }: CourseCarouselSkeletonProps) {
  return (
    <div className={className}>
      <Skeleton className="mb-3 h-6 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 space-y-2">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { CourseCarouselSkeleton };
