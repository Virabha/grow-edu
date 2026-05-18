"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayCircle, Users, MessageSquare } from "lucide-react";
import Link from "next/link";
export function LiveEcosystem() {
    const [viewers, setViewers] = useState(1200);
    useEffect(() => {
        const sequence = [1200, 1220, 1309, 1374, 1400, 1200];
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % sequence.length;
            setViewers(sequence[index]);
        }, 1500);
        return () => clearInterval(interval);
    }, []);
    return (<section id="markets" className="py-10 sm:py-12 md:py-16 px-4 sm:px-6 bg-background overflow-hidden" aria-labelledby="live-ecosystem-heading">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-16 lg:gap-24">
        <div className="flex-1 space-y-5 sm:space-y-6 md:space-y-8 z-10 text-center md:text-left">
          <h2 id="live-ecosystem-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Interactive <span className="text-primary">Live Learning.</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
            Join daily live sessions with expert educators. Participate in
            real-time Q&A and interactive workshops to accelerate your learning.
          </p>

          <ul className="space-y-3 sm:space-y-4 list-none p-0" role="list" aria-label="Live learning features">
            <li className="flex items-center justify-center md:justify-start gap-3 text-foreground text-sm sm:text-base">
              <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5"/>
              </div>
              <span>Daily Expert-Led Sessions</span>
            </li>
            <li className="flex items-center justify-center md:justify-start gap-3 text-foreground text-sm sm:text-base">
              <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <Users className="w-4 h-4 sm:w-5 sm:h-5"/>
              </div>
              <span>Live Q&A with Mentors</span>
            </li>
            <li className="flex items-center justify-center md:justify-start gap-3 text-foreground text-sm sm:text-base">
              <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5"/>
              </div>
              <span>Community Study Groups</span>
            </li>
          </ul>

          <Link href="/signup" aria-label="Join the next live learning session">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-5 md:py-6">
              Join Next Session
            </Button>
          </Link>
        </div>

        <figure className="flex-1 relative w-full aspect-video" aria-label="Live learning session preview">
          <motion.div whileHover={{ y: -5 }} className="relative w-full h-full bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" aria-hidden="true"/>
                <span className="text-[10px] sm:text-xs font-bold text-destructive uppercase tracking-wider">
                  Live
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                <span className="sr-only">Current viewers: </span>
                {viewers.toLocaleString()} Viewers
              </div>
            </div>

            <div className="flex-1 bg-muted rounded-md sm:rounded-lg mb-3 sm:mb-4 relative overflow-hidden" role="img" aria-label="Live session progress visualization">
              <div className="absolute inset-0 flex items-end justify-around px-2 sm:px-4 pb-2 sm:pb-4">
                {[40, 60, 45, 70, 55, 80, 65, 90].map((h, i) => (<motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{
                duration: 1,
                delay: i * 0.1,
                repeat: Infinity,
                repeatType: "reverse",
            }} className="w-2 sm:w-3 md:w-4 bg-primary rounded-t-sm opacity-80" aria-hidden="true"/>))}
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 items-center" aria-hidden="true">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted"/>
              <div className="flex-1 space-y-1.5 sm:space-y-2">
                <div className="h-1.5 sm:h-2 w-1/3 bg-muted rounded-full"/>
                <div className="h-1.5 sm:h-2 w-3/4 bg-muted-foreground/50 rounded-full"/>
              </div>
            </div>
          </motion.div>
        </figure>
      </div>
    </section>);
}
