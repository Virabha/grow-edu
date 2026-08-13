"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { SecureImage } from "@/components/ui/secure-image";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Course, LessonInCourse } from "@/lib/api/services/courses";
import axios from "axios";
import { useAuthStore } from "@/lib/store/auth-store";
import { env } from "@/lib/env";
interface CourseHeroBackgroundProps {
    course: Course;
    className?: string;
}
export function CourseHeroBackground({ course, className }: CourseHeroBackgroundProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [_isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { token } = useAuthStore();
    const freePreviewLesson = useMemo((): LessonInCourse | null => {
        if (!course.sections)
            return null;
        for (const section of course.sections) {
            if (!section.lessons)
                continue;
            for (const lesson of section.lessons) {
                if (lesson.isFreePreview && lesson.type === "VIDEO") {
                    return lesson;
                }
            }
        }
        return null;
    }, [course.sections]);
    useEffect(() => {
        async function fetchVideoUrl() {
            if (!freePreviewLesson)
                return;
            const lessonId = freePreviewLesson.lessonId;
            if (!lessonId || !token)
                return;
            setIsVideoLoading(true);
            setVideoError(false);
            try {
                const baseUrl = env.NEXT_PUBLIC_API_URL;
                const { data } = await axios.get(`${baseUrl}/lessons/${lessonId}/play`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (data.signedUrl) {
                    setVideoUrl(data.signedUrl);
                }
                else {
                    setVideoError(true);
                }
            }
            catch {
                setVideoError(true);
            }
            finally {
                setIsVideoLoading(false);
            }
        }
        fetchVideoUrl();
    }, [freePreviewLesson, token]);
    function handleToggleMute() {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    }
    function handleTogglePlay() {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            }
            else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }
    const showVideo = freePreviewLesson && videoUrl && !videoError;
    const showThumbnail = !showVideo && course.thumbnail;
    if (!showVideo && !showThumbnail) {
        return null;
    }
    return (<div className={cn("relative w-full aspect-[21/9] sm:aspect-[21/7] overflow-hidden", className)}>
      
      {showVideo && (<>
          <video ref={videoRef} src={videoUrl} autoPlay muted={isMuted} loop playsInline className="absolute inset-0 w-full h-full object-cover" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={() => setVideoError(true)}/>
          
          <div className="absolute bottom-4 right-4 z-20 flex gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20" onClick={handleTogglePlay}>
              {isPlaying ? (<Pause className="h-4 w-4"/>) : (<Play className="h-4 w-4"/>)}
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20" onClick={handleToggleMute}>
              {isMuted ? (<VolumeX className="h-4 w-4"/>) : (<Volume2 className="h-4 w-4"/>)}
            </Button>
          </div>
        </>)}

      
      {!showVideo && showThumbnail && (<SecureImage src={course.thumbnail!} alt={course.title} className="absolute inset-0 w-full h-full object-cover"/>)}

      
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10"/>
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent z-10"/>

      
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 sm:p-8 lg:p-12">
        <div className="max-w-3xl space-y-4">
          
          {course.category && (<span className="inline-block px-3 py-1 text-xs font-semibold bg-primary/90 text-primary-foreground rounded-full">
              {course.category.name}
            </span>)}
          
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight drop-shadow-lg">
            {course.title}
          </h1>
          
          
          {course.description && (<p className="text-sm sm:text-base text-muted-foreground line-clamp-2 max-w-2xl drop-shadow-md">
              {course.description}
            </p>)}

          
          {freePreviewLesson && (<div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="h-4 w-4"/>
              <span>Free Preview Available</span>
            </div>)}
        </div>
      </div>
    </div>);
}
