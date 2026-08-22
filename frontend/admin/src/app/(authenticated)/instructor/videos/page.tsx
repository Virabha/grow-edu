"use client";
import Link from "next/link";
import { GraduationCap, ArrowUpRight } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";

export default function InstructorVideosPage() {
  return (
    <PageLayout
      subtitle="Studio"
      header="Videos"
      description="Video lessons are now managed per-batch under the Content tab."
    >
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GraduationCap className="mx-auto size-12 text-muted-foreground/40" />
        <p className="font-display mt-4 text-xl font-medium text-foreground">
          Videos live inside batches
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Open a batch and navigate to its Content tab to upload or manage video lessons.
        </p>
        <Button asChild className="mt-6 gap-1.5">
          <Link href="/admin/batches">
            Go to batches
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </PageLayout>
  );
}
