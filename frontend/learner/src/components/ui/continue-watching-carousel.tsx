"use client";

import * as React from "react";
import Link from "next/link";
import type { Course } from "@/lib/api/services/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SecureImage } from "@/components/ui/secure-image";

interface ContinueWatchingCarouselProps {
  courses: Course[];
  className?: string;
}

function ContinueWatchingCarousel({
  courses,
  className,
}: ContinueWatchingCarouselProps) {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-3">Continue Watching</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {courses.map((course) => (
          <Link
            key={course.courseId}
            href={`/courses/${course.courseId}`}
            className="w-64 shrink-0"
          >
            <Card className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {course.thumbnail ? (
                  <SecureImage
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <CardContent className="p-3">
                <h4 className="font-medium line-clamp-2 text-sm">
                  {course.title}
                </h4>
                <Button size="sm" className="mt-2 w-full">
                  Continue
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { ContinueWatchingCarousel };
