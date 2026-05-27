"use client";

import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { SecureImage } from "@/components/ui/secure-image";
import {
  useBatchBySlug,
  useBatchDoubt,
  useReplyToDoubt,
} from "@/lib/hooks/use-batches";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LearnerDoubtPage(props: {
  params: Promise<{ slug: string; doubtId: string }>;
}) {
  const { slug, doubtId } = use(props.params);
  const { data: batch } = useBatchBySlug(slug);
  const { data: doubt, isLoading } = useBatchDoubt(batch?.batchId ?? null, doubtId);
  const reply = useReplyToDoubt(batch?.batchId ?? "", doubtId);
  const [body, setBody] = useState("");

  async function postReply() {
    if (!body.trim()) return;
    try {
      await reply.mutateAsync(body.trim());
      setBody("");
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post");
    }
  }

  if (isLoading || !batch) {
    return (
      <PageLayout header="Loading…">
        <Skeleton className="h-48 w-full" />
      </PageLayout>
    );
  }

  if (!doubt) {
    return (
      <PageLayout header="Not found">
        <EmptyState title="Doubt not found" />
      </PageLayout>
    );
  }

  return (
    <PageLayout subtitle="Doubt" header={doubt.title}>
      <div className="-mt-4 mb-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/batches/${slug}`}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back
          </Link>
        </Button>
      </div>

      <article className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2 text-sm">
          {doubt.author.profileImage && (
            <SecureImage
              src={doubt.author.profileImage}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          )}
          <span className="font-medium">
            {[doubt.author.firstName, doubt.author.lastName].filter(Boolean).join(" ") ||
              "Student"}
          </span>
          <span className="text-muted-foreground">{formatDateTime(doubt.createdAt)}</span>
          <Badge
            variant={
              doubt.status === "OPEN"
                ? "secondary"
                : doubt.status === "ANSWERED"
                  ? "default"
                  : "outline"
            }
          >
            {doubt.status}
          </Badge>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{doubt.body}</p>
      </article>

      <h2 className="mt-6 mb-3 font-display text-base font-medium">
        Replies ({doubt.replies.length})
      </h2>
      <ul className="space-y-3">
        {doubt.replies.map((r) => (
          <li
            key={r.replyId}
            className={`rounded-2xl border bg-card p-4 ${
              r.isOfficial ? "border-emerald-500/40" : "border-border"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-sm">
              {r.author.profileImage && (
                <SecureImage
                  src={r.author.profileImage}
                  alt=""
                  className="size-6 rounded-full object-cover"
                />
              )}
              <span className="font-medium">
                {[r.author.firstName, r.author.lastName].filter(Boolean).join(" ") ||
                  "Reply"}
              </span>
              {r.isOfficial && (
                <Badge className="gap-1 bg-emerald-600 text-white">
                  <ShieldCheck className="size-3" />
                  Official
                </Badge>
              )}
              <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 font-display text-sm font-medium">Reply</h3>
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Help out…"
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={postReply} disabled={reply.isPending || !body.trim()}>
            Post
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
