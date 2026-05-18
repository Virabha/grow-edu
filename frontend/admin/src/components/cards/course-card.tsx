"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Course } from "@/lib/api/services/courses";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
interface CourseCardProps {
  course: Course;
}
export function CourseCard({ course }: CourseCardProps) {
  const price = parseFloat(course.price);
  const compareAt = course.compareAtPrice
    ? parseFloat(String(course.compareAtPrice))
    : null;
  const showCompareAt =
    compareAt !== null && !isNaN(compareAt) && compareAt > price;
  return (
    <Card className="flex flex-col h-full overflow-visible group hover:shadow-lg transition-shadow">
      {course.thumbnail && (
        <div className="aspect-video w-full overflow-hidden relative group">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {course.category && (
            <Badge className="absolute top-2 right-2 bg-black/70 hover:bg-black/80 backdrop-blur-sm text-[10px] sm:text-xs">
              {course.category.name}
            </Badge>
          )}
        </div>
      )}
      <CardHeader className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm sm:text-base md:text-lg group-hover:line-clamp-none line-clamp-2">
            {course.title}
          </CardTitle>
        </div>
        <CardDescription className="line-clamp-2 sm:line-clamp-3 group-hover:line-clamp-none mt-1.5 sm:mt-2 text-xs sm:text-sm">
          {course.description}
        </CardDescription>

        <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-xs sm:text-sm text-yellow-500 font-medium">
          <span>4.8</span>
          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
          <span className="text-muted-foreground ml-1">(120)</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-4 md:px-6 pb-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          {course.instructor && (
            <span>
              By {course.instructor.firstName} {course.instructor.lastName}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 border-t p-3 sm:p-4 bg-muted/20">
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-primary">
            ₹{price.toFixed(2)}
          </span>
          {showCompareAt && (
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              ₹{compareAt!.toFixed(2)}
            </span>
          )}
        </div>
        {/* <Link
          href={`/learner/courses/${course.courseId}`}
          className="w-full sm:w-auto"
        > */}
        <Button size="sm" className="w-full text-xs sm:text-sm">
          View Details
        </Button>
        {/* </Link> */}
      </CardFooter>
    </Card>
  );
}
