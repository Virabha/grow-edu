"use client";

import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { SecureImage } from "@/components/ui/secure-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  useBatchDoubt,
  useReplyToDoubt,
  useUpdateBatchDoubt,
} from "@/features/batches/hooks/use-batches";
import type { BatchDoubtStatus } from "@/features/batches/types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminDoubtDetailPage(props: {
  params: Promise<{ batchId: string; doubtId: string }>;
}) {
  const { batchId, doubtId } = use(props.params);
  const { data: doubt, isLoading } = useBatchDoubt(batchId, doubtId);
  const reply = useReplyToDoubt(batchId, doubtId);
  const updateDoubt = useUpdateBatchDoubt(batchId);
  const [replyBody, setReplyBody] = useState("");

  async function postReply() {
    if (!replyBody.trim()) return;
    try {
      await reply.mutateAsync({ body: replyBody.trim() });
      setReplyBody("");
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    }
  }

  function setStatus(status: BatchDoubtStatus) {
    updateDoubt.mutate(
      { doubtId, dto: { status } },
      { onSuccess: () => toast.success(`Marked ${status.toLowerCase()}`) }
    );
  }

  if (isLoading) {
    return (
      <PageLayout header="Loading doubt…">
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
    <PageLayout
      subtitle="Doubt"
      header={doubt.title}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/batches/${batchId}`}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to batch
          </Link>
        </Button>
      }
    >
      <article className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
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
          </div>
          <Select
            value={doubt.status}
            onValueChange={(v) => setStatus(v as BatchDoubtStatus)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="ANSWERED">Answered</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
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
            className="rounded-2xl border border-border bg-card p-4"
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
        <h3 className="mb-2 font-display text-sm font-medium">Post an official reply</h3>
        <Textarea
          rows={4}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Your answer (marked official)"
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={postReply} disabled={reply.isPending || !replyBody.trim()}>
            Post reply
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
