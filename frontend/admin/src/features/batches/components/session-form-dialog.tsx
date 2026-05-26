"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  useCreateBatchSession,
  useUpdateBatchSession,
} from "../hooks/use-batches";
import type { BatchSession, BatchSubject } from "../types";

const schema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    type: z.enum(["LIVE", "RECORDING"]),
    subjectId: z.string().optional(),
    liveProvider: z
      .enum(["GOOGLE_MEET", "ZOOM", "JITSI", "YOUTUBE_LIVE", "CUSTOM_URL"])
      .optional(),
    joinUrl: z.string().url().optional().or(z.literal("")),
    meetingId: z.string().optional(),
    meetingPasscode: z.string().optional(),
    scheduledStartAt: z.string().optional(),
    scheduledEndAt: z.string().optional(),
    recordingVideoId: z.string().optional(),
    recordingDurationSeconds: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "LIVE") {
      if (!v.scheduledStartAt)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledStartAt"],
          message: "Required for live",
        });
      if (!v.scheduledEndAt)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledEndAt"],
          message: "Required for live",
        });
      if (
        v.scheduledStartAt &&
        v.scheduledEndAt &&
        new Date(v.scheduledEndAt) <= new Date(v.scheduledStartAt)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledEndAt"],
          message: "End must be after start",
        });
      }
      if (!v.liveProvider)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["liveProvider"],
          message: "Pick a provider",
        });
      if (v.liveProvider && v.liveProvider !== "GOOGLE_MEET" && !v.joinUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["joinUrl"],
          message: "Required (or use Google Meet auto-generate)",
        });
      }
    }
    if (v.type === "RECORDING" && !v.recordingVideoId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recordingVideoId"],
        message: "Bunny Stream video ID required",
      });
    }
  });

type Values = z.infer<typeof schema>;

const defaults: Values = {
  title: "",
  description: "",
  type: "LIVE",
  subjectId: "",
  liveProvider: "GOOGLE_MEET",
  joinUrl: "",
  meetingId: "",
  meetingPasscode: "",
  scheduledStartAt: "",
  scheduledEndAt: "",
  recordingVideoId: "",
  recordingDurationSeconds: undefined,
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function SessionFormDialog(props: {
  batchId: string;
  subjects: BatchSubject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: BatchSession | null;
  defaultType?: "LIVE" | "RECORDING";
}) {
  const { batchId, subjects, open, onOpenChange, session, defaultType } = props;
  const isEditing = !!session;
  const create = useCreateBatchSession(batchId);
  const update = useUpdateBatchSession(batchId);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ...defaults, type: defaultType ?? "LIVE" },
  });
  const type = form.watch("type");
  const provider = form.watch("liveProvider");

  useEffect(() => {
    if (session) {
      form.reset({
        title: session.title,
        description: session.description ?? "",
        type: session.type,
        subjectId: session.subjectId ?? "",
        liveProvider: session.liveProvider ?? undefined,
        joinUrl: session.joinUrl ?? "",
        meetingId: session.meetingId ?? "",
        meetingPasscode: session.meetingPasscode ?? "",
        scheduledStartAt: toDatetimeLocal(session.scheduledStartAt),
        scheduledEndAt: toDatetimeLocal(session.scheduledEndAt),
        recordingVideoId: session.recordingVideoId ?? "",
        recordingDurationSeconds: session.recordingDurationSeconds ?? undefined,
      });
    } else {
      form.reset({ ...defaults, type: defaultType ?? "LIVE" });
    }
  }, [session, defaultType, form]);

  useEffect(() => {
    if (!open) form.reset({ ...defaults, type: defaultType ?? "LIVE" });
  }, [open, defaultType, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      type: values.type,
      subjectId: values.subjectId?.trim() || undefined,
      ...(values.type === "LIVE"
        ? {
            liveProvider: values.liveProvider,
            joinUrl: values.joinUrl?.trim() || undefined,
            meetingId: values.meetingId?.trim() || undefined,
            meetingPasscode: values.meetingPasscode?.trim() || undefined,
            scheduledStartAt: values.scheduledStartAt
              ? new Date(values.scheduledStartAt).toISOString()
              : undefined,
            scheduledEndAt: values.scheduledEndAt
              ? new Date(values.scheduledEndAt).toISOString()
              : undefined,
          }
        : {
            recordingVideoId: values.recordingVideoId?.trim() || undefined,
            recordingDurationSeconds: values.recordingDurationSeconds,
          }),
    };
    if (isEditing && session) {
      update.mutate(
        { sessionId: session.sessionId, dto: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{isEditing ? "Edit session" : "Add session"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LIVE">Live class</SelectItem>
                        <SelectItem value="RECORDING">Recording</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Kinematics — Chapter 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select value={field.value || "_none"} onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="(optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.subjectId} value={s.subjectId}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === "LIVE" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="scheduledStartAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduledEndAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="liveProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GOOGLE_MEET">Google Meet</SelectItem>
                            <SelectItem value="ZOOM">Zoom</SelectItem>
                            <SelectItem value="JITSI">Jitsi</SelectItem>
                            <SelectItem value="YOUTUBE_LIVE">YouTube Live</SelectItem>
                            <SelectItem value="CUSTOM_URL">Custom URL</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="joinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Join URL
                          {provider === "GOOGLE_MEET" && " (optional — leave blank to auto-generate via Calendar)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://meet.google.com/abc-defg-hij"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="meetingId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="meetingPasscode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passcode</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="recordingVideoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bunny Stream video ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. f3a1e7e0-1234-…"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recordingDurationSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            value={field.value ?? ""}
                            placeholder="3600"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isEditing ? "Save" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
