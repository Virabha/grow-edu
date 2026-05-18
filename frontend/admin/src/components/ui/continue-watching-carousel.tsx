"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/api/services/courses";
interface ContinueWatchingCarouselProps {
    courses: Course[];
    className?: string;
}
export function ContinueWatchingCarousel({ courses, className, }: ContinueWatchingCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
    return (<div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl sm:text-2xl font-bold">Continue Watching</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("left")} disabled={!canScrollLeft}>
            <ChevronLeft className="h-4 w-4"/>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("right")} disabled={!canScrollRight}>
            <ChevronRight className="h-4 w-4"/>
          </Button>
        </div>
      </div>

      <div className="relative group">
        <div ref={scrollRef} className="flex gap-4 overflow-visible scrollbar-hide scroll-smooth py-8 px-4 sm:px-6" style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x mandatory",
        }}>
          {courses.map((course, index) => {
            const courseId = course.courseId;
            return (<motion.div key={courseId} className="flex-shrink-0 w-[calc(100vw-3rem)] sm:w-[320px] md:w-[360px] snap-start h-[420px]" transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: [0.4, 0, 0.2, 1],
                }} initial={{ opacity: 0, scale: 0.9 }} style={{
                    scrollSnapAlign: "start",
                    zIndex: hoveredIndex === index ? 100 : 1,
                }} animate={{
                    opacity: 1,
                    y: hoveredIndex === index ? -20 : 0,
                    scale: hoveredIndex === index ? 1.05 : 1,
                    height: hoveredIndex === index ? "auto" : "420px",
                }} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)}>
                <Card className={cn("overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm group/card flex flex-col transition-all duration-300 h-full", hoveredIndex === index && "shadow-2xl ring-2 ring-primary/20")}>
                  <motion.div initial={{ height: "200px" }} animate={{
                    height: "200px",
                }} className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg overflow-hidden flex-shrink-0" transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} style={{ zIndex: 1 }}>
                    {course.thumbnail ? (<img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"/>) : (<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/5">
                        <img src="/illustrations/focused.svg" alt="" className="w-36 h-36 opacity-90"/>
                      </div>)}

                    {course.category && (<div className="absolute top-2 left-2">
                        <span className="px-2 py-1 text-xs font-semibold bg-black/70 text-white rounded backdrop-blur-sm">
                          {course.category.name}
                        </span>
                      </div>)}

                    
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/card:bg-black/20 transition-colors">
                      <Link href={`/learner/courses/${courseId}/watch`}>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <Button size="lg" className="h-16 w-16 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-2xl">
                            <Play className="h-8 w-8 ml-1" fill="currentColor"/>
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  </motion.div>

                  <motion.div className={cn("p-4 flex flex-col transition-all duration-300 bg-card relative min-h-[160px]", hoveredIndex === index && "bg-card/90")} style={{ zIndex: 2 }}>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-base sm:text-lg line-clamp-2 mb-2 flex-shrink-0">
                          {course.title}
                        </h3>
                        {course.description && (<p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 flex-shrink-0" style={{ minHeight: "2.5rem" }}>
                            {course.description}
                          </p>)}
                      </div>
                      
                      {hoveredIndex === index && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
                          <Link href={`/learner/courses/${courseId}/watch`} className="w-full block">
                            <Button className="w-full bg-[#E3B558] hover:bg-[#d4a74d] text-black font-semibold">
                              Resume
                            </Button>
                          </Link>
                        </motion.div>)}
                    </div>
                  </motion.div>
                </Card>
              </motion.div>);
        })}
        </div>
      </div>
    </div>);
}
