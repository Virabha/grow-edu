"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Play, Info, Volume2, VolumeX, Sparkles, Clock, User, } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Course, LessonInCourse } from "@/lib/api/services/courses";
import { useAuthStore } from "@/lib/store/auth-store";
import axios from "axios";
import { env } from "@/lib/env";
interface HeroBannerProps {
    course: Course;
    className?: string;
}
export function HeroBanner({ course, className }: HeroBannerProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { token } = useAuthStore();
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);
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
        async function fetchSignedVideoUrl() {
            if (!freePreviewLesson) {
                setSignedVideoUrl(null);
                return;
            }
            const lessonId = freePreviewLesson.lessonId;
            if (!lessonId || !token) {
                setSignedVideoUrl(null);
                return;
            }
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
                    setSignedVideoUrl(data.signedUrl);
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
        fetchSignedVideoUrl();
    }, [freePreviewLesson, token]);
    const handleToggleMute = useCallback(() => {
        setIsMuted((prev) => !prev);
    }, []);
    const totalDuration = useMemo(() => {
        return (course.sections?.reduce((total, section) => {
            const sectionDuration = section.lessons?.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) || 0;
            return total + sectionDuration;
        }, 0) || 0);
    }, [course.sections]);
    const formatDuration = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }, []);
    const showVideo = signedVideoUrl && !videoError && !isVideoLoading;
    const showThumbnail = !showVideo && course.thumbnail;
    return (<div ref={containerRef} className={cn("relative w-full h-[40vh] sm:h-[80vh] md:h-[85vh] lg:h-[90vh] overflow-hidden group", className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <motion.div className="absolute inset-0" style={{ opacity, scale }}>
        {showVideo ? (<motion.video src={signedVideoUrl} autoPlay muted={isMuted} loop playsInline className="absolute inset-0 w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} onError={() => setVideoError(true)}/>) : showThumbnail ? (<motion.img src={course.thumbnail} alt={course.title} className="absolute inset-0 w-full h-full object-cover" initial={{ scale: 1 }} animate={{ scale: isHovered ? 1.05 : 1 }} transition={{ duration: 8, ease: "easeInOut" }}/>) : (<div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10"/>)}
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20"/>
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"/>

      <div className="relative z-10 h-full flex flex-col justify-end pb-8 sm:pb-16 md:pb-20 lg:pb-24 px-4 sm:px-8 md:px-12 lg:px-20 xl:px-32">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }} className="max-w-3xl space-y-3 sm:space-y-5 md:space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {course.category && (<span className="px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-sm font-bold bg-primary text-primary-foreground rounded-full shadow-lg">
                <Sparkles className="inline h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-1.5"/>
                {course.category.name}
              </span>)}
            {totalDuration > 0 && (<span className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-semibold bg-white/10 text-white rounded-full backdrop-blur-md flex items-center gap-1 sm:gap-1.5">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>
                {formatDuration(totalDuration)}
              </span>)}
            {course.instructor && (<span className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-semibold bg-white/10 text-white rounded-full backdrop-blur-md flex items-center gap-1 sm:gap-1.5">
                <User className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>
                {course.instructor.firstName || course.instructor.email}
              </span>)}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] drop-shadow-2xl tracking-tight">
            {course.title}
          </motion.h1>

          {course.description && (<motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="text-xs sm:text-base md:text-lg text-white/95 line-clamp-2 sm:line-clamp-3 max-w-2xl drop-shadow-xl font-medium leading-relaxed">
              {course.description}
            </motion.p>)}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }} className="flex flex-row items-center gap-3 sm:gap-5 pt-2 sm:pt-4">
            <Link href={`/learner/courses/${course.courseId}/watch`} className="group/button flex-1 sm:flex-none">
              <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-white/90 text-sm sm:text-lg px-4 sm:px-10 py-5 sm:py-8 rounded-xl font-bold gap-2 sm:gap-3 shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105">
                <Play className="h-5 w-5 sm:h-7 sm:w-7 fill-current group-hover/button:scale-110 transition-transform"/>
                <span>Start</span>
              </Button>
            </Link>
            <Link href={`/learner/courses/${course.courseId}`} className="group/button flex-1 sm:flex-none">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 text-white border-2 border-white/40 hover:bg-white/20 text-sm sm:text-lg px-4 sm:px-10 py-5 sm:py-8 rounded-xl font-bold gap-2 sm:gap-3 backdrop-blur-md hover:border-white/60 transition-all duration-300 hover:scale-105">
                <Info className="h-5 w-5 sm:h-7 sm:w-7"/>
                <span>Info</span>
              </Button>
            </Link>
            {showVideo && (<Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-110" onClick={handleToggleMute}>
                {isMuted ? (<VolumeX className="h-6 w-6 sm:h-7 sm:w-7"/>) : (<Volume2 className="h-6 w-6 sm:h-7 sm:w-7"/>)}
              </Button>)}
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"/>
    </div>);
}
