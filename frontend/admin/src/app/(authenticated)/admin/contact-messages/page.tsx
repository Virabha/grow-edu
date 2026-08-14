"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, MailOpen, Reply } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusPill } from "@/components/admin/status-pill";
import {
  useResourceList,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { formatDateTime } from "@/lib/format";

export default function ContactMessagesPage() {
  const [status, setStatus] = React.useState("all");
  const [reading, setReading] = React.useState<ResourceRow | null>(null);
  const [reply, setReply] = React.useState("");

  const { data, isLoading, isError, error, refetch } = useResourceList(
    "contact-messages",
    { status, limit: 25 },
  );
  const update = useUpdateResource("contact-messages");

  const rows = data?.data ?? [];
  const unread = rows.filter((r) => r.status === "NEW").length;

  function open(row: ResourceRow) {
    setReading(row);
    setReply("");
    if (row.status === "NEW") {
      update.mutate({ id: String(row.id), status: "READ" });
    }
  }

  function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reading) return;
    if (reply.trim().length < 10) {
      toast.error("Write a reply of at least 10 characters.");
      return;
    }
    update.mutate(
      { id: String(reading.id), status: "REPLIED", replyBody: reply.trim() },
      {
        onSuccess: () => {
          toast.success(`Reply sent to ${String(reading.email)}`);
          setReading(null);
          setReply("");
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not send the reply"),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Support"
      header="Contact messages"
      description="Enquiries from the public contact form."
      filters={
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All messages</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="READ">Read</SelectItem>
              <SelectItem value="REPLIED">Replied</SelectItem>
            </SelectContent>
          </Select>
          {unread > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{unread}</span> waiting
              for a first reply
            </p>
          )}
        </div>
      }
    >
      {isError ? (
        <EmptyState
          title="We could not load messages"
          description={error instanceof Error ? error.message : "Please try again."}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No messages"
          description="Nothing has come through the contact form with those filters."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const isNew = row.status === "NEW";
            return (
              <li key={String(row.id)}>
                <button
                  type="button"
                  onClick={() => open(row)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {isNew ? (
                      <Mail className="h-4 w-4 text-blue-600" />
                    ) : (
                      <MailOpen className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          isNew ? "text-sm font-semibold" : "text-sm font-medium"
                        }
                      >
                        {String(row.subject ?? "")}
                      </span>
                      <StatusPill value={String(row.status ?? "")} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(row.name ?? "")} · {String(row.email ?? "")}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {String(row.message ?? "")}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                    {formatDateTime(String(row.createdAt ?? ""))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <FormSheet
        open={!!reading}
        onOpenChange={(open) => !open && setReading(null)}
        title={reading ? String(reading.subject) : ""}
        description={
          reading ? `${String(reading.name)} · ${String(reading.email)}` : ""
        }
        onSubmit={sendReply}
        submitLabel="Send reply"
        submitting={update.isPending}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-sm leading-relaxed">
              {reading ? String(reading.message) : ""}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Received {reading ? formatDateTime(String(reading.createdAt)) : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="msg-email">Email</Label>
              <Input id="msg-email" value={reading ? String(reading.email) : ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-phone">Phone</Label>
              <Input id="msg-phone" value={reading ? String(reading.phone ?? "—") : ""} readOnly />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-reply">
              <Reply className="mr-1 inline h-3.5 w-3.5" />
              Your reply
            </Label>
            <Textarea
              id="msg-reply"
              rows={6}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Answer the question directly, and say what happens next."
            />
          </div>
        </div>
      </FormSheet>
    </PageLayout>
  );
}
