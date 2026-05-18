"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });
    const circleClipPath = useTransform(scrollYProgress, [0, 0.5], ["circle(0vmax at 50% 50%)", "circle(150vmax at 50% 50%)"]);
    const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const textY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
    const revealedContentOpacity = useTransform(scrollYProgress, [0.5, 0.6], [0, 1]);
    const revealedContentScale = useTransform(scrollYProgress, [0.5, 0.6], [0, 1]);
    const revealedContentY = useTransform(scrollYProgress, [0.5, 0.7], ["100%", "0%"]);
    const backgroundPhotoOpacity = useTransform(scrollYProgress, [0, 0.12, 0.5], [0, 0.18, 0.45]);
    const headlineWords = "Unlock Skills That Drive Your Future".split(" ");
    return (<section ref={containerRef} className="relative h-[250vh] bg-background" aria-label="Hero section - Loshi Edu">
      <div className="sticky top-0 h-screen h-[100dvh] overflow-hidden">
        
        <motion.div style={{ clipPath: circleClipPath }} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <motion.div style={{ opacity: backgroundPhotoOpacity }} className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2664&auto=format&fit=crop')] bg-cover bg-center grayscale" role="img" aria-label="Online learning background"/>

          <div className="relative z-10 flex flex-col items-center justify-center px-4">
            <motion.div style={{
            scale: revealedContentScale,
            opacity: revealedContentOpacity,
        }} className="mb-4 sm:mb-6 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-bold tracking-widest text-primary uppercase">
              Premium Online Learning
            </motion.div>

            <div className="overflow-hidden">
              <motion.p style={{ y: revealedContentY, opacity: revealedContentOpacity }} className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 text-center" role="heading" aria-level={2}>
                Learn Smarter. Grow Faster.
              </motion.p>
            </div>

            <motion.p style={{ opacity: revealedContentOpacity }} className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-300 max-w-2xl text-center mb-6 sm:mb-8 px-2">
              Premium online courses for learners, professionals, and organisations.
              Build real-world skills through expert-led programs designed to help you
              advance your career and stay future-ready.
            </motion.p>

            <motion.div style={{ opacity: revealedContentOpacity }} className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Link href="/learner/courses" aria-label="Explore courses">
                <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6 font-semibold">
                  Explore Courses
                </Button>
              </Link>
              <Link href="/signup" aria-label="Start learning today">
                <Button variant="outline" className="w-full sm:w-auto bg-transparent border-white/30 text-white hover:bg-white hover:text-foreground text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6">
                  Start Learning Today
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        
        <motion.header style={{ opacity: textOpacity, y: textY }} className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-auto px-4 pt-16 sm:pt-20">
          <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-muted-foreground">
            LOSHI EDU
          </p>

          <h1 className="mt-3 text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-foreground tracking-tighter text-center flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2">
            {headlineWords.map((word, i) => (<motion.span key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{
                delay: 0.2 + i * 0.06,
                duration: 0.8,
                ease: "easeOut",
            }}>
                {["Skills", "Future"].includes(word) ? (<span className="text-primary">{word}</span>) : (word)}
              </motion.span>))}
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }} className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl text-center leading-relaxed">
            Learn Smarter. Grow Faster. Lead With Purpose.
          </motion.p>

          <motion.nav initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.8 }} className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0" aria-label="Hero actions">
            <Link href="/learner/courses" aria-label="Explore courses" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6 font-bold">
                Explore Courses
              </Button>
            </Link>
            <Link href="#categories" aria-label="Explore categories" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-transparent border-foreground/20 text-foreground hover:bg-foreground hover:text-background text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6">
                Explore Categories
              </Button>
            </Link>
          </motion.nav>
        </motion.header>
      </div>
    </section>);
}
