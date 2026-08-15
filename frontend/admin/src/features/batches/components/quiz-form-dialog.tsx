"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSheet } from "@/components/ui/form-sheet";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import {
  useCreateBatchQuiz,
  useUpdateBatchQuiz,
} from "../hooks/use-batches";
import type { BatchQuiz, BatchSubject } from "../types";
import { getApiError } from "@/lib/api/errors";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

const schema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    subjectId: z.string().optional(),
    durationMinutes: z.coerce.number().int().min(1, "Min 1 minute").default(30),
    maxAttempts: z.coerce.number().int().min(1, "Min 1 attempt").default(1),
    negativeMarkPercent: z.coerce.number().min(0).max(100).default(0),
    passingPercent: z.coerce.number().min(0).max(100).default(40),
    showLeaderboard: z.boolean().default(true),
    showSolutions: z.boolean().default(true),
    opensAt: z.string().optional(),
    closesAt: z.string().optional(),
    publish: z.boolean().default(false),
  })
  .refine(
    (v) =>
      !v.opensAt || !v.closesAt || new Date(v.closesAt) > new Date(v.opensAt),
    { message: "Closes must be after opens", path: ["closesAt"] },
  );

type Values = z.infer<typeof schema>;
const defaults: Values = {
  title: "",
  description: "",
  subjectId: "",
  durationMinutes: 30,
  maxAttempts: 1,
  negativeMarkPercent: 0,
  passingPercent: 40,
  showLeaderboard: true,
  showSolutions: true,
  opensAt: "",
  closesAt: "",
  publish: false,
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuizFormDialog(props: {
  batchId: string;
  subjects: BatchSubject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz?: BatchQuiz | null;
}) {
  const { batchId, subjects, open, onOpenChange, quiz } = props;
  const isEditing = !!quiz;
  const create = useCreateBatchQuiz(batchId);
  const update = useUpdateBatchQuiz(batchId);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (quiz) {
      form.reset({
        title: quiz.title,
        description: quiz.description ?? "",
        subjectId: quiz.subjectId ?? "",
        durationMinutes: quiz.durationMinutes,
        maxAttempts: quiz.maxAttempts,
        negativeMarkPercent: Number(quiz.negativeMarkPercent),
        passingPercent: Number(quiz.passingPercent),
        showLeaderboard: quiz.showLeaderboard,
        showSolutions: quiz.showSolutions,
        opensAt: toDatetimeLocal(quiz.opensAt),
        closesAt: toDatetimeLocal(quiz.closesAt),
        publish: !!quiz.publishedAt,
      });
    } else {
      form.reset(defaults);
    }
  }, [open, quiz, form]);

  const isPending = create.isPending || update.isPending;

  async function onSubmit(values: Values) {
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        subjectId: values.subjectId?.trim() || undefined,
        durationMinutes: values.durationMinutes,
        maxAttempts: values.maxAttempts,
        negativeMarkPercent: values.negativeMarkPercent,
        passingPercent: values.passingPercent,
        showLeaderboard: values.showLeaderboard,
        showSolutions: values.showSolutions,
        opensAt: values.opensAt
          ? new Date(values.opensAt).toISOString()
          : undefined,
        closesAt: values.closesAt
          ? new Date(values.closesAt).toISOString()
          : undefined,
        publish: values.publish,
      };
      if (isEditing && quiz) {
        await update.mutateAsync({ quizId: quiz.quizId, dto: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      const apiError = getApiError(err);
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        form.setError(field as FieldPath<Values>, { type: "server", message });
      }
      if (Object.keys(apiError.fieldErrors).length === 0) {
        toast.error(apiError.message);
      }
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit quiz" : "New quiz"}
      description="Configure test settings — questions are added separately."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditing ? "Save" : "Create quiz"}
      submitting={isPending}
    >
      <Form {...form}>
        <div className="space-y-2.5">
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
                    placeholder="Kinematics — Test 1"
                  />
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
                <FormLabel className={LABEL_CLS}>Subject</FormLabel>
                <Select
                  value={field.value || "_none"}
                  onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
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
                    placeholder="Optional notes for students"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Duration (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
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
              name="maxAttempts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Max attempts</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
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
              name="negativeMarkPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Negative %</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
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
            name="passingPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLS}>Passing %</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    {...field}
                    className={FIELD_CLS}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="opensAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Opens (optional)</FormLabel>
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
              name="closesAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Closes (optional)</FormLabel>
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

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <FormField
              control={form.control}
              name="publish"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3">
                  <div className="space-y-0">
                    <FormLabel className={LABEL_CLS}>
                      Publish to learners
                    </FormLabel>
                    <p className="text-[11px] text-muted-foreground">
                      Make this quiz visible to enrolled students
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showLeaderboard"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3">
                  <FormLabel className={LABEL_CLS}>Show leaderboard</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showSolutions"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3">
                  <FormLabel className={LABEL_CLS}>Show solutions after submit</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </FormSheet>
  );
}
