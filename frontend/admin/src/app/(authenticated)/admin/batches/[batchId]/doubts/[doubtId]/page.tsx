"use client";

import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SecureImage } from "@/components/ui/secure-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useBatchDoubt,
  useReplyToDoubt,
  useUpdateBatchDoubt,
} from "@/features/batches/hooks/use-batches";
import type { BatchDoubtStatus, DoubtAuthor } from "@/features/batches/types";

const STATUS_TONE: Record<
  BatchDoubtStatus,
  { dot: string; label: string; pill: string }
> = {
  OPEN: {
    dot: "bg-amber-500",
    label: "Open",
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  ANSWERED: {
    dot: "bg-emerald-500",
    label: "Answered",
    pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  CLOSED: {
    dot: "bg-zinc-400",
    label: "Closed",
    pill: "border-border bg-muted text-muted-foreground",
  },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(author: DoubtAuthor): string {
  const first = author.firstName?.[0] ?? "";
  const last = author.lastName?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function Avatar({ author, size = 28 }: { author: DoubtAuthor; size?: number }) {
  if (author.profileImage) {
    return (
      <SecureImage
        src={author.profileImage}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(author)}
    </div>
  );
}

function nameOf(author: DoubtAuthor, fallback = "Student"): string {
  return (
    [author.firstName, author.lastName].filter(Boolean).join(" ") || fallback
  );
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
      // global mutation error toast covers it
    }
  }

  function setStatus(status: BatchDoubtStatus) {
    updateDoubt.mutate(
      { doubtId, dto: { status } },
      { onSuccess: () => toast.success(`Marked ${status.toLowerCase()}`) },
    );
  }

  if (isLoading) {
    return (
      <PageLayout subtitle="Doubt" header="Loading…">
        <div className="space-y-2">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!doubt) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted/30">
          <MessageCircleQuestion className="size-10 text-muted-foreground/50" />
        </div>
        <h1 className="mb-3 font-display text-2xl font-medium text-foreground">
          Doubt not found
        </h1>
        <Button asChild size="sm">
          <Link href={`/admin/batches/${batchId}`}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to batch
          </Link>
        </Button>
      </div>
    );
  }

  const tone = STATUS_TONE[doubt.status];

  return (
    <PageLayout
      subtitle="Doubt"
      header={doubt.title}
      description={`Asked by ${nameOf(doubt.author)} · ${formatDateTime(
        doubt.createdAt,
      )}`}
    >
      <div className="-mt-2 mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <Link href={`/admin/batches/${batchId}`}>
            <ArrowLeft className="size-3 mr-1" />
            Back to batch
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              tone.pill,
            )}
          >
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {tone.label}
          </span>
          <Select
            value={doubt.status}
            onValueChange={(v) => setStatus(v as BatchDoubtStatus)}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Open
                </span>
              </SelectItem>
              <SelectItem value="ANSWERED">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Answered
                </span>
              </SelectItem>
              <SelectItem value="CLOSED">
                <span className="flex items-center gap-2">
                  <Lock className="size-3 text-muted-foreground" />
                  Closed
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Original question */}
      <article className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center gap-2.5">
          <Avatar author={doubt.author} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {nameOf(doubt.author)}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {formatDateTime(doubt.createdAt)}
            </p>
          </div>
        </header>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {doubt.body}
        </p>
      </article>

      {/* Replies thread */}
      <div className="mt-4 flex items-center gap-2">
        <h2 className="font-display text-sm font-medium text-foreground">
          Replies
        </h2>
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
          {doubt.replies.length}
        </span>
      </div>

      {doubt.replies.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
          <MessageCircleQuestion className="mx-auto size-6 text-muted-foreground/50" />
          <p className="mt-2 text-xs text-muted-foreground">
            No replies yet — be the first to answer.
          </p>
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {doubt.replies.map((r) => (
            <li
              key={r.replyId}
              className={cn(
                "rounded-xl border bg-card p-3",
                r.isOfficial
                  ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                  : "border-border",
              )}
            >
              <header className="mb-2 flex items-center gap-2">
                <Avatar author={r.author} size={24} />
                <span className="text-sm font-medium text-foreground">
                  {nameOf(r.author, "Reply")}
                </span>
                {r.isOfficial && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                    <ShieldCheck className="size-2.5" />
                    Official
                  </span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {formatDateTime(r.createdAt)}
                </span>
              </header>
              <p className="whitespace-pre-wrap pl-8 text-sm leading-relaxed text-foreground/90">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Compose */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Post an official reply
          </h3>
        </div>
        <Textarea
          rows={3}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Your answer — visible to all enrolled students, marked official."
          className="min-h-[72px] text-sm"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Posting will mark this doubt as{" "}
            <span className="font-medium text-foreground">Answered</span>.
          </p>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={postReply}
            disabled={reply.isPending || !replyBody.trim()}
          >
            <Send className="size-3" />
            Post reply
          </Button>
        </div>
      </div>

      {doubt.status === "CLOSED" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <XCircle className="size-3.5" />
          This doubt is closed. Re-open via the status dropdown above.
        </div>
      )}
    </PageLayout>
  );
}
