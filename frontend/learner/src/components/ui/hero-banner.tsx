"use client";

import Link from "next/link";
import type { Course } from "@/lib/api/services/courses";
import { Button } from "@/components/ui/button";
import { SecureImage } from "@/components/ui/secure-image";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  course: Course;
  className?: string;
}

function HeroBanner({ course, className }: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative w-full aspect-[21/9] min-h-[200px] overflow-hidden rounded-xl bg-muted",
        className
      )}
    >
      {course.thumbnail ? (
        <SecureImage
          src={course.thumbnail}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <h2 className="text-xl font-bold text-white drop-shadow md:text-2xl">
          {course.title}
        </h2>
        {course.description && (
          <p className="text-white/90 mt-1 line-clamp-2 text-sm drop-shadow md:line-clamp-1">
            {course.description}
          </p>
        )}
        <Link href={`/courses/${course.courseId}`} className="mt-3 inline-block">
          <Button size="lg" className="gap-2">
            View Course
          </Button>
        </Link>
      </div>
    </div>
  );
}

export { HeroBanner };
