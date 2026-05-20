"use client";
import { useParams } from "next/navigation";
import { FileText, Video as VideoIcon } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import { useCourse } from "@/lib/hooks/use-courses";
import { CourseModerationPanel } from "@/features/courses/components/course-moderation-panel";

export default function AdminCourseReviewDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading } = useCourse({ id: courseId });

  if (isLoading) {
    return (
      <PageLayout subtitle="Moderation" header="Loading…">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!course) {
    return (
      <PageLayout subtitle="Moderation" header="Course not found">
        <p className="text-sm text-muted-foreground">
          This submission may have been withdrawn.
        </p>
      </PageLayout>
    );
  }

  const instructorName =
    [course.instructor?.firstName, course.instructor?.lastName]
      .filter(Boolean)
      .join(" ") || course.instructor?.email || "Unknown instructor";

  return (
    <PageLayout
      subtitle="Moderation"
      header={course.title}
      description={`Submitted by ${instructorName}`}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <article className="overflow-hidden rounded-2xl border border-border bg-card">
            <header className="border-b border-border/70 px-5 py-3.5">
              <p className="font-display text-base font-medium text-foreground">
                Course content
              </p>
              <p className="text-xs text-muted-foreground">
                Expand each section to review lessons.
              </p>
            </header>
            <div className="p-3 sm:p-5">
              <Accordion type="single" collapsible>
                {course.sections?.map((section) => (
                  <AccordionItem
                    key={section.sectionId}
                    value={section.sectionId}
                  >
                    <AccordionTrigger className="font-display text-left text-base font-medium">
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {section.lessons?.map((lesson) => (
                          <div
                            key={lesson.lessonId}
                            className="rounded-xl border border-border bg-background p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                {lesson.type === "VIDEO" ? (
                                  <VideoIcon className="size-4" />
                                ) : (
                                  <FileText className="size-4" />
                                )}
                                {lesson.title}
                              </div>
                              <Badge
                                variant="outline"
                                className="rounded-full text-[10px] uppercase tracking-widest"
                              >
                                {lesson.type}
                              </Badge>
                            </div>
                            {lesson.type === "VIDEO" && (
                              <div className="mt-3 overflow-hidden rounded-lg">
                                <SecureVideoPlayer
                                  lessonId={lesson.lessonId}
                                />
                              </div>
                            )}
                            {lesson.type === "TEXT" && lesson.textContent && (
                              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                                {lesson.textContent}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-base font-medium text-foreground">
              Course details
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Description
                </dt>
                <dd className="mt-1 leading-relaxed text-foreground">
                  {course.description}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Price
                  </dt>
                  <dd className="font-display mt-1 text-base font-medium text-foreground">
                    ₹{course.price}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Category
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {course.category?.name || "—"}
                  </dd>
                </div>
              </div>
            </dl>
          </article>
        </div>

        <div className="space-y-4">
          <CourseModerationPanel courseId={course.courseId} />
        </div>
      </div>
    </PageLayout>
  );
}
