"use client";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/api/services/courses";
interface CourseCarouselProps {
    title: string | ReactNode;
    courses: Course[];
    className?: string;
    showScrollButtons?: boolean;
    enrolledCourseIds?: Set<string>;
}
export function CourseCarousel({ title, courses, className, showScrollButtons = true, enrolledCourseIds, }: CourseCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const handleImageError = (courseId: string) => {
        setFailedImages((prev) => {
            const newSet = new Set(prev);
            newSet.add(courseId);
            return newSet;
        });
    };
    const handleMouseEnter = (index: number) => {
        setHoveredIndex(index);
    };
    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };
    const checkScrollability = () => {
        if (!scrollRef.current)
            return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };
    useEffect(() => {
        checkScrollability();
        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.addEventListener("scroll", checkScrollability);
            window.addEventListener("resize", checkScrollability);
            return () => {
                scrollElement.removeEventListener("scroll", checkScrollability);
                window.removeEventListener("resize", checkScrollability);
            };
        }
        return;
    }, [courses]);
    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current)
            return;
        const container = scrollRef.current;
        const containerWidth = container.clientWidth;
        const isMobile = window.innerWidth < 640;
        if (isMobile) {
            const cardWidth = containerWidth - 32;
            const gap = 16;
            const nextCardPeek = (containerWidth - 32) * 0.1;
            const scrollAmount = cardWidth + gap - nextCardPeek;
            container.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
        else {
            const scrollAmount = containerWidth * 0.8;
            container.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };
    if (!courses || courses.length === 0)
        return null;
    return (<div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl sm:text-2xl font-bold">
          {typeof title === "string" ? title : title}
        </h2>
        {showScrollButtons && (<div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("left")} disabled={!canScrollLeft}>
              <ChevronLeft className="h-4 w-4"/>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("right")} disabled={!canScrollRight}>
              <ChevronRight className="h-4 w-4"/>
            </Button>
          </div>)}
      </div>

      <div className="relative group">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto overflow-y-visible scrollbar-hide scroll-smooth pb-8 px-2 sm:px-2" style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x mandatory",
        }}>
          {courses.map((course, index) => {
            const courseId = course.courseId;
            const isEnrolled = enrolledCourseIds?.has(courseId);
            const imageFailed = failedImages.has(courseId);
            return (<motion.div key={courseId} className="flex-shrink-0 w-[calc(100vw-2rem)] sm:w-[320px] md:w-[360px] snap-start" transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: [0.4, 0, 0.2, 1],
                }} initial={{ opacity: 0, scale: 0.9 }} style={{
                    scrollSnapAlign: "start",
                    zIndex: hoveredIndex === index ? 100 : 1,
                }} animate={{
                    opacity: 1,
                    y: hoveredIndex === index ? -8 : 0,
                    scale: hoveredIndex === index ? 1.05 : 1,
                }} onMouseEnter={() => handleMouseEnter(index)} onMouseLeave={handleMouseLeave}>
                <Card className={cn("overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm group/card flex flex-col transition-all duration-300 h-[400px]", hoveredIndex === index &&
                    "shadow-2xl ring-2 ring-primary/20")}>
                  <div className="relative h-[200px] bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 overflow-hidden">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="w-full h-full">
                      {course.thumbnail && !imageFailed ? (<motion.img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" transition={{ duration: 0.3 }} animate={{ scale: hoveredIndex === index ? 1.05 : 1 }} onError={() => handleImageError(courseId)}/>) : (<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/5">
                          <img src="/illustrations/analytics_setup.svg" alt="" className="w-36 h-36 opacity-90"/>
                        </div>)}
                    </motion.div>

                    {course.category && (<div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-1 text-xs font-semibold bg-black/70 text-white rounded backdrop-blur-sm">
                          {course.category.name}
                        </span>
                      </div>)}
                  </div>
                  
                  <div className={cn("p-4 flex flex-col flex-1 bg-card relative transition-colors duration-300", hoveredIndex === index && "bg-card/90")}>
                    <div className="flex-1 min-h-0">
                      <h3 className="font-bold text-base sm:text-lg mb-2 line-clamp-2" title={course.title}>
                        {course.title}
                      </h3>
                      {course.description && (<p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-3">
                          {course.description}
                        </p>)}
                    </div>
                    <div className="flex items-center justify-between shrink-0 mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-primary">
                          ₹{parseFloat(course.price).toFixed(2)}
                        </span>
                        {course.compareAtPrice &&
                          !Number.isNaN(parseFloat(String(course.compareAtPrice))) &&
                          parseFloat(String(course.compareAtPrice)) >
                            parseFloat(course.price) && (
                            <span className="text-xs text-muted-foreground line-through">
                              ₹{parseFloat(String(course.compareAtPrice)).toFixed(
                                2
                              )}
                            </span>
                          )}
                      </div>
                      <Link href={isEnrolled ? `/learner/courses/${courseId}/watch` : `/learner/courses/${courseId}`} onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className={cn("text-xs transition-all duration-200 pointer-events-auto", hoveredIndex === index &&
                    "bg-primary text-primary-foreground border-primary")}>
                          {isEnrolled ? "Go to Course" : "View Details"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>);
        })}
        </div>
      </div>
    </div>);
}
