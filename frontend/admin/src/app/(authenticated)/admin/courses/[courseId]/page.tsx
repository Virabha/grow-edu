"use client";
import { use, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  User,
  Tag,
  IndianRupee,
  Clock,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
} from "lucide-react";
import type { AxiosError } from "axios";

import { PageLayout } from "@/components/layout/page-layout";
import {
  useCourse,
  useApproveCourse,
  useRejectCourse,
  useRequestCourseChanges,
} from "@/features/courses/hooks/use-courses";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const approveSchema = z.object({
  reviewNotes: z.string().optional(),
});

const rejectSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

const changesSchema = z.object({
  reviewNotes: z.string().min(1, "Please provide feedback for the instructor"),
});

export default function AdminCourseReviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();
  const { data: course, isLoading } = useCourse({ enabled: true, courseId });
  const approveMutation = useApproveCourse();
  const rejectMutation = useRejectCourse();
  const requestChangesMutation = useRequestCourseChanges();
  const [previewVideo, setPreviewVideo] = useState<{
    lessonId: string;
    title: string;
    sectionTitle: string;
  } | null>(null);

  const approveForm = useForm({
    resolver: zodResolver(approveSchema),
    defaultValues: { reviewNotes: "" },
  });

  const changesForm = useForm({
    resolver: zodResolver(changesSchema),
    defaultValues: { reviewNotes: "" },
  });

  const rejectForm = useForm({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejectionReason: "" },
  });

  const handleApprove = async (data: z.infer<typeof approveSchema>) => {
    if (!course?.courseId) return;
    try {
      await approveMutation.mutateAsync({
        id: course.courseId,
        notes: data.reviewNotes,
        publish: true,
      });
      toast.success("Course approved successfully!");
      router.push("/admin/courses");
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to approve"
      );
    }
  };

  const handleRequestChanges = async (
    data: z.infer<typeof changesSchema>
  ) => {
    if (!course?.courseId) return;
    try {
      await requestChangesMutation.mutateAsync({
        id: course.courseId,
        notes: data.reviewNotes,
      });
      toast.success("Changes requested successfully!");
      router.push("/admin/courses");
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to request changes"
      );
    }
  };

  const handleReject = async (data: z.infer<typeof rejectSchema>) => {
    if (!course?.courseId) return;
    try {
      await rejectMutation.mutateAsync({
        id: course.courseId,
        reason: data.rejectionReason,
      });
      toast.success("Course rejected!");
      router.push("/admin/courses");
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to reject"
      );
    }
  };

  if (isLoading)
    return (
      <PageLayout header="Loading..." subtitle="Course Administration">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </PageLayout>
    );

  if (!course) return <div>Course not found</div>;

  const reviewStatusColor =
    course.reviewStatus === "APPROVED"
      ? "bg-green-100 text-green-800 border-green-200"
      : course.reviewStatus === "PENDING_REVIEW"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : course.reviewStatus === "REJECTED"
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-gray-100 text-gray-800 border-gray-200";

  const totalLessons =
    course.sections?.reduce((s, sec) => s + (sec.lessons?.length ?? 0), 0) ??
    0;
  const videoLessons =
    course.sections?.reduce(
      (s, sec) =>
        s +
        (sec.lessons?.filter((l) => l.type === "VIDEO").length ?? 0),
      0
    ) ?? 0;

  return (
    <PageLayout
      header={`Review: ${course.title}`}
      subtitle="Course Administration"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Course details */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          {/* Course overview card */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-44 h-28 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      width={176}
                      height={112}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="size-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-semibold text-lg leading-tight">
                      {course.title}
                    </h2>
                    <Badge
                      variant={
                        course.status === "PUBLISHED"
                          ? "default"
                          : "secondary"
                      }
                      className="shrink-0"
                    >
                      {course.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                    {course.description}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="size-3.5" />
                      <span className="truncate">
                        {course.instructor?.firstName}{" "}
                        {course.instructor?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="size-3.5" />
                      <span className="truncate">
                        {course.category?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <IndianRupee className="size-3.5" />
                      <span>{course.price}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <BookOpen className="size-3.5" />
                      <span>
                        {course.sections?.length ?? 0} sections,{" "}
                        {totalLessons} lessons
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Curriculum */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Curriculum</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {videoLessons} videos, {totalLessons - videoLessons} other
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(course.sections || []).map((section, idx) => (
                  <div
                    key={section.sectionId}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-muted/30 px-4 py-2.5 text-sm font-medium flex items-center gap-2">
                      <span className="flex items-center justify-center size-5 rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {idx + 1}
                      </span>
                      {section.title}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {section.lessons?.length ?? 0} lessons
                      </span>
                    </div>
                    <div className="divide-y">
                      {section.lessons?.map((lesson, lIdx) => {
                        const LessonIcon =
                          lesson.type === "VIDEO"
                            ? Video
                            : lesson.type === "QUIZ"
                              ? HelpCircle
                              : FileText;
                        return (
                          <div
                            key={lesson.lessonId}
                            className="flex items-center justify-between px-4 py-2 group hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <LessonIcon className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm text-muted-foreground truncate">
                                {lIdx + 1}. {lesson.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 shrink-0"
                              >
                                {lesson.type}
                              </Badge>
                              {lesson.status && lesson.status !== "READY" && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 shrink-0"
                                >
                                  {lesson.status}
                                </Badge>
                              )}
                            </div>
                            {lesson.type === "VIDEO" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
                                onClick={() =>
                                  setPreviewVideo({
                                    lessonId: lesson.lessonId,
                                    title: lesson.title,
                                    sectionTitle: section.title,
                                  })
                                }
                              >
                                <Play className="size-3 mr-1" />
                                Preview
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Review actions */}
        <div className="space-y-4 order-1 lg:order-2">
          {/* Review status banner */}
          <div
            className={cn(
              "rounded-lg border px-4 py-3 flex items-center gap-2",
              reviewStatusColor
            )}
          >
            <Clock className="size-4 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold">Review Status</span>
              <p className="text-sm font-bold">
                {(course.reviewStatus || "N/A").replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Review actions card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Review Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="approve" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger
                    value="approve"
                    className="text-green-600 text-xs py-2 gap-1"
                  >
                    <CheckCircle className="size-3.5" />
                    <span className="hidden sm:inline">Approve</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="changes"
                    className="text-orange-500 text-xs py-2 gap-1"
                  >
                    <AlertCircle className="size-3.5" />
                    <span className="hidden sm:inline">Changes</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="reject"
                    className="text-red-500 text-xs py-2 gap-1"
                  >
                    <XCircle className="size-3.5" />
                    <span className="hidden sm:inline">Reject</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="approve" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">
                    Approve and publish this course for students.
                  </p>
                  <Form {...approveForm}>
                    <FormField
                      control={approveForm.control}
                      name="reviewNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Notes (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Internal notes..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={approveForm.handleSubmit(handleApprove)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="size-4 mr-1.5" />
                      {approveMutation.isPending
                        ? "Approving..."
                        : "Approve & Publish"}
                    </Button>
                  </Form>
                </TabsContent>

                <TabsContent value="changes" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">
                    Request changes from the instructor.
                  </p>
                  <Form {...changesForm}>
                    <FormField
                      control={changesForm.control}
                      name="reviewNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Feedback / Instructions
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="What needs to be fixed?"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={changesForm.handleSubmit(handleRequestChanges)}
                      disabled={requestChangesMutation.isPending}
                    >
                      <AlertCircle className="size-4 mr-1.5" />
                      {requestChangesMutation.isPending
                        ? "Sending..."
                        : "Request Changes"}
                    </Button>
                  </Form>
                </TabsContent>

                <TabsContent value="reject" className="space-y-3 pt-3">
                  <p className="text-sm text-muted-foreground">
                    Reject this course permanently.
                  </p>
                  <Form {...rejectForm}>
                    <FormField
                      control={rejectForm.control}
                      name="rejectionReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Rejection Reason
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Why is this rejected?"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={rejectForm.handleSubmit(handleReject)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="size-4 mr-1.5" />
                      {rejectMutation.isPending
                        ? "Rejecting..."
                        : "Reject Course"}
                    </Button>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={!!previewVideo}
        onOpenChange={(open) => !open && setPreviewVideo(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Admin preview
            </p>
            <DialogTitle className="line-clamp-2">
              {previewVideo?.title}
            </DialogTitle>
            {previewVideo?.sectionTitle && (
              <DialogDescription className="line-clamp-1">
                {previewVideo.sectionTitle}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="w-full overflow-hidden rounded-xl">
            {previewVideo?.lessonId && (
              <SecureVideoPlayer lessonId={previewVideo.lessonId} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
