import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
export const metadata: Metadata = {
    title: "Page Not Found | Loshi Edu",
    description: "The page you're looking for doesn't exist or has been moved.",
    robots: {
        index: false,
        follow: true,
    },
};
export default function NotFound() {
    return (<main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <span className="text-8xl font-bold text-primary">404</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">
          Page Not Found
        </h1>

        <p className="text-muted-foreground text-lg mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" aria-label="Go to homepage">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" aria-hidden="true"/>
              Go to Homepage
            </Button>
          </Link>

          <Link href="/learner/courses" aria-label="Browse courses">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              Browse Courses
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a href="mailto:support@loshiedu.com" className="text-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </main>);
}
