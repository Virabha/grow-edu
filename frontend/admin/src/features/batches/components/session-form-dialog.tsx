"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

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
          message: "Required",
        });
      if (!v.scheduledEndAt)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledEndAt"],
          message: "Required",
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
          message: "Required for this provider",
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
    d.getHours(),
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
    if (!open) return;
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
  }, [open, session, defaultType, form]);

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
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Edit session" : "Add session"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={FIELD_CLS}>
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
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Subject</FormLabel>
                      <Select
                        value={field.value || "_none"}
                        onValueChange={(v) =>
                          field.onChange(v === "_none" ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className={FIELD_CLS}>
                            <SelectValue placeholder="—" />
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
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className={FIELD_CLS}
                        placeholder="Kinematics — Chapter 1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        className="min-h-[56px] text-xs"
                        placeholder="Optional notes"
                      />
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
                          <FormLabel className={LABEL_CLS}>Start</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              className={FIELD_CLS}
                            />
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
                          <FormLabel className={LABEL_CLS}>End</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              className={FIELD_CLS}
                            />
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
                        <FormLabel className={LABEL_CLS}>Provider</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={FIELD_CLS}>
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
                        <FormLabel className={LABEL_CLS}>
                          Join URL
                          {provider === "GOOGLE_MEET" && (
                            <span className="ml-1 font-normal text-muted-foreground">
                              (optional — auto-generated if blank)
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className={FIELD_CLS}
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
                          <FormLabel className={LABEL_CLS}>Meeting ID</FormLabel>
                          <FormControl>
                            <Input {...field} className={FIELD_CLS} />
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
                          <FormLabel className={LABEL_CLS}>Passcode</FormLabel>
                          <FormControl>
                            <Input {...field} className={FIELD_CLS} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="recordingVideoId"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className={LABEL_CLS}>
                          Bunny Stream video ID
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className={FIELD_CLS}
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
                        <FormLabel className={LABEL_CLS}>Duration (s)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            value={field.value ?? ""}
                            className={FIELD_CLS}
                            placeholder="3600"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isEditing ? "Save" : "Add session"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
