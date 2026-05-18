"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { useCourses } from "@/features/courses/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Video, BookOpen, ExternalLink, Edit, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
interface VideoLesson {
    lessonId: string;
    title: string;
    description?: string;
    duration?: number;
    status: string;
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    sectionId: string;
    sectionTitle: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}
export default function InstructorVideosPage() {
    const { user } = useAuthStore();
    const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
    const { data: coursesData, isLoading } = useCourses({
        enabled: !!user?.id,
        filters: {
            instructorId: user?.id,
            limit: 100,
        },
    });
    const videoLessons = useMemo<VideoLesson[]>(() => {
        if (!coursesData?.data)
            return [];
        const videos: VideoLesson[] = [];
        coursesData.data.forEach((course) => {
            course.sections?.forEach((section) => {
                section.lessons?.forEach((lesson) => {
                    if (lesson.type === "VIDEO") {
                        videos.push({
                            lessonId: lesson.lessonId,
                            title: lesson.title,
                            description: lesson.description,
                            duration: lesson.duration,
                            status: lesson.status || "DRAFT",
                            courseId: course.courseId,
                            courseTitle: course.title,
                            courseSlug: course.slug,
                            sectionId: section.sectionId,
                            sectionTitle: section.title,
                            order: lesson.order,
                            createdAt: course.createdAt,
                            updatedAt: course.updatedAt,
                        });
                    }
                });
            });
        });
        return videos.sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }, [coursesData]);
    const getStatusBadge = (status: string) => {
        const statusConfig = {
            READY: {
                label: "Ready",
                variant: "default" as const,
                className: "bg-green-100 text-green-800 border-green-200",
            },
            PROCESSING: {
                label: "Processing",
                variant: "secondary" as const,
                className: "bg-blue-100 text-blue-800 border-blue-200",
            },
            DRAFT: {
                label: "Draft",
                variant: "outline" as const,
                className: "bg-gray-100 text-gray-800 border-gray-200",
            },
            PENDING_APPROVAL: {
                label: "Pending",
                variant: "secondary" as const,
                className: "bg-yellow-100 text-yellow-800 border-yellow-200",
            },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
        return (<Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>);
    };
    const formatDuration = (seconds?: number) => {
        if (!seconds)
            return "N/A";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };
    return (<PageLayout header="My Videos" subtitle="Video Management" description="View and manage all your uploaded video lessons.">
      {isLoading ? (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }}>
              <Card className="overflow-hidden">
                <Skeleton className="aspect-video w-full"/>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4 mb-2"/>
                  <Skeleton className="h-4 w-full mb-1"/>
                  <Skeleton className="h-4 w-5/6"/>
                  <Skeleton className="h-5 w-20 mt-3 rounded-full"/>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1 rounded-md"/>
                    <Skeleton className="h-9 flex-1 rounded-md"/>
                  </div>
                </CardContent>
              </Card>
            </motion.div>))}
        </motion.div>) : videoLessons.length === 0 ? (<EmptyState title="No videos yet" description="Upload your first video lesson to get started." icon={<Video className="h-12 w-12"/>} action={{
                label: "Create Course",
                onClick: () => (window.location.href = "/instructor/courses/new"),
            }}/>) : (<div className="space-y-2.5 sm:space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">All Videos</h2>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                {videoLessons.length} video
                {videoLessons.length !== 1 ? "s" : ""} across{" "}
                {new Set(videoLessons.map((v) => v.courseId)).size} course
                {new Set(videoLessons.map((v) => v.courseId)).size !== 1
                ? "s"
                : ""}
              </p>
            </div>
            <Link href="/instructor/courses/new">
              <Button className="w-full sm:w-auto">
                <BookOpen className="h-4 w-4 mr-2"/>
                <span className="hidden sm:inline">Create Course</span>
                <span className="sm:hidden">New Course</span>
              </Button>
            </Link>
          </div>

          <div className="grid gap-3 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {videoLessons.map((video, index) => (<motion.div key={video.lessonId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.4 }}>
                <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg relative bg-black">
                    {video.status === "READY" ? (<SecureVideoPlayer lessonId={video.lessonId} className="w-full h-full" autoPlay={false} showStatus={true}/>) : (<div className="w-full h-full flex flex-col items-center justify-center text-foreground">
                        <Video className="h-12 w-12 mb-2 text-muted-foreground"/>
                        <p className="text-sm text-muted-foreground">
                          {video.status === "PROCESSING"
                        ? "Processing..."
                        : "Not Ready"}
                        </p>
                      </div>)}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(video.status)}
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="line-clamp-2 leading-tight">
                      {video.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {video.description || "No description provided."}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3"/>
                      <span className="line-clamp-1">{video.courseTitle}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Section: {video.sectionTitle}</span>
                      {video.duration && (<>
                          <span>•</span>
                          <span>{formatDuration(video.duration)}</span>
                        </>)}
                    </div>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0">
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <Button variant="outline" className="flex-1 min-w-[70px]" size="sm" onClick={() => {
                    setPreviewLessonId(video.lessonId);
                }} disabled={video.status !== "READY"}>
                        <Play className="h-4 w-4 sm:mr-2"/>
                        <span className="hidden sm:inline">Preview</span>
                      </Button>

                      <Link href={`/instructor/courses/${video.courseId}/edit`} className="flex-1 min-w-[80px]">
                        <Button variant="outline" className="w-full" size="sm">
                          <Edit className="h-4 w-4 sm:mr-2"/>
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </Link>

                      <Link href={`/courses/${video.courseSlug}`} target="_blank" className="flex-1 min-w-[80px]">
                        <Button variant="ghost" className="w-full" size="sm">
                          <ExternalLink className="h-4 w-4 sm:mr-2"/>
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>))}
          </div>
        </div>)}

      
      <Dialog open={!!previewLessonId} onOpenChange={(open) => {
            if (!open)
                setPreviewLessonId(null);
        }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {previewLessonId ? (videoLessons.find((v) => v.lessonId === previewLessonId)?.title || "Video Preview") : "Video Preview"}
            </DialogTitle>
            <DialogDescription>
              {previewLessonId ? (<>
                  {videoLessons.find((v) => v.lessonId === previewLessonId)?.courseTitle || ""} -{" "}
                  {videoLessons.find((v) => v.lessonId === previewLessonId)?.sectionTitle || ""}
                </>) : ("")}
            </DialogDescription>
          </DialogHeader>
          {previewLessonId && (<div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
              <SecureVideoPlayer key={previewLessonId} lessonId={previewLessonId} autoPlay={true} showStatus={true}/>
            </div>)}
        </DialogContent>
      </Dialog>
    </PageLayout>);
}
