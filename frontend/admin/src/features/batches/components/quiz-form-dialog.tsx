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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  useCreateBatchQuiz,
  useUpdateBatchQuiz,
} from "../hooks/use-batches";
import type { BatchQuiz, BatchSubject } from "../types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subjectId: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1).default(30),
  maxAttempts: z.coerce.number().int().min(1).default(1),
  negativeMarkPercent: z.coerce.number().min(0).max(100).default(0),
  passingPercent: z.coerce.number().min(0).max(100).default(40),
  showLeaderboard: z.boolean().default(true),
  showSolutions: z.boolean().default(true),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  publish: z.boolean().default(false),
});

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
  }, [quiz, form]);

  useEffect(() => {
    if (!open) form.reset(defaults);
  }, [open, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
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
      opensAt: values.opensAt ? new Date(values.opensAt).toISOString() : undefined,
      closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : undefined,
      publish: values.publish,
    };
    if (isEditing && quiz) {
      update.mutate(
        { quizId: quiz.quizId, dto: payload },
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
          <DialogTitle>{isEditing ? "Edit quiz" : "New quiz"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Kinematics — Test 1" />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
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
                    <Select
                      value={field.value || "_none"}
                      onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
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
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
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
                      <FormLabel>Max attempts</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
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
                      <FormLabel>Negative %</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="passingPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passing %</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publish"
                  render={({ field }) => (
                    <FormItem className="flex items-end gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Publish to learners</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="opensAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens (optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
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
                      <FormLabel>Closes (optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="showLeaderboard"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Show leaderboard</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showSolutions"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Show solutions</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isEditing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
