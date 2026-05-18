"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
export function CTA() {
    return (<section className="py-10 sm:py-12 md:py-10 px-4 sm:px-6 bg-gradient-to-r from-primary to-primary/80" aria-labelledby="cta-heading">
      <div className="max-w-4xl mx-auto text-center">
        <h2 id="cta-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 sm:mb-6 md:mb-8 tracking-tight">
          Join grotutor Today
        </h2>
        <p className="text-primary-foreground/80 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
          Start building skills that create real opportunities. Learn smarter, grow faster,
          and lead with purpose.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link href="/learner/courses" aria-label="Explore courses">
            <Button className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-6 font-bold rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              Explore Courses
            </Button>
          </Link>
          <Link href="/signup" aria-label="Start learning today">
            <Button variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-6 font-bold rounded-full">
              Start Learning Today
            </Button>
          </Link>
        </div>
      </div>
    </section>);
}
