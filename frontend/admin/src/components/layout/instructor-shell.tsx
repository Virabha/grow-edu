"use client";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InstructorNavbar } from "@/components/layout/instructor-navbar";
import { ReactNode } from "react";
type InstructorShellProps = {
    children: ReactNode;
};
export function InstructorShell({ children }: InstructorShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const showBackButton = ["/courses/new", "/edit", "/add", "/create"].some((path) => pathname?.includes(path));
    return (<div className="min-h-screen bg-background flex flex-col">
      <InstructorNavbar />
      <div className="flex-1 pt-12 sm:pt-14 container mx-auto px-3 sm:px-4 py-3 max-w-7xl">
        {showBackButton && (<div className="mb-3">
            <Button variant="ghost" onClick={() => router.back()} className="gap-1.5 pl-0 hover:pl-1.5 transition-all text-xs">
              <ArrowLeft className="h-3.5 w-3.5"/>
              Back
            </Button>
          </div>)}
        {children}
      </div>
    </div>);
}
