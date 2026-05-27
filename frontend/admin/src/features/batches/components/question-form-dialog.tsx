"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2 } from "lucide-react";
import {
  useCreateQuizQuestion,
  useUpdateQuizQuestion,
} from "../hooks/use-batches";
import type { QuizQuestion } from "../types";

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "Option text required"),
});

const schema = z
  .object({
    order: z.coerce.number().int().min(0).default(0),
    type: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "NUMERICAL"]),
    prompt: z.string().min(1, "Question text required"),
    options: z.array(optionSchema).optional().default([]),
    correctSingle: z.string().optional(),
    correctMulti: z.array(z.string()).optional().default([]),
    numericalValue: z.coerce.number().optional(),
    numericalTolerance: z.coerce.number().min(0).optional(),
    marks: z.coerce.number().min(0).default(1),
    explanation: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "MCQ_SINGLE") {
      if ((v.options?.length ?? 0) < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Need at least 2 options",
        });
      }
      if (!v.correctSingle || !v.options.find((o) => o.id === v.correctSingle)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctSingle"],
          message: "Pick a correct option",
        });
      }
    } else if (v.type === "MCQ_MULTI") {
      if ((v.options?.length ?? 0) < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Need at least 2 options",
        });
      }
      if (!v.correctMulti || v.correctMulti.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctMulti"],
          message: "Pick at least one correct option",
        });
      }
    } else if (v.type === "NUMERICAL") {
      if (v.numericalValue === undefined || Number.isNaN(v.numericalValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numericalValue"],
          message: "Required for numerical",
        });
      }
    }
  });

type Values = z.infer<typeof schema>;

function makeId() {
  return Math.random().toString(36).slice(2, 8);
}

function defaultValues(order = 0): Values {
  return {
    order,
    type: "MCQ_SINGLE",
    prompt: "",
    options: [
      { id: makeId(), text: "" },
      { id: makeId(), text: "" },
    ],
    correctSingle: undefined,
    correctMulti: [],
    numericalValue: undefined,
    numericalTolerance: 0,
    marks: 1,
    explanation: "",
  };
}

export function QuestionFormDialog(props: {
  batchId: string;
  quizId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: QuizQuestion | null;
  nextOrder?: number;
}) {
  const { batchId, quizId, open, onOpenChange, question, nextOrder = 0 } = props;
  const isEditing = !!question;
  const create = useCreateQuizQuestion(batchId, quizId);
  const update = useUpdateQuizQuestion(batchId, quizId);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(nextOrder),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });
  const type = form.watch("type");

  useEffect(() => {
    if (question) {
      const v: Values = {
        order: question.order,
        type: question.type,
        prompt: question.prompt,
        options: question.options ?? [],
        correctSingle:
          question.type === "MCQ_SINGLE"
            ? (question.correctAnswer as string)
            : undefined,
        correctMulti:
          question.type === "MCQ_MULTI"
            ? ((question.correctAnswer as string[]) ?? [])
            : [],
        numericalValue:
          question.type === "NUMERICAL"
            ? (question.correctAnswer as { value: number }).value
            : undefined,
        numericalTolerance:
          question.type === "NUMERICAL"
            ? (question.correctAnswer as { tolerance?: number }).tolerance ?? 0
            : 0,
        marks: Number(question.marks),
        explanation: question.explanation ?? "",
      };
      form.reset(v);
    } else {
      form.reset(defaultValues(nextOrder));
    }
  }, [question, nextOrder, form]);

  useEffect(() => {
    if (!open) form.reset(defaultValues(nextOrder));
  }, [open, nextOrder, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    let correctAnswer: unknown;
    if (values.type === "MCQ_SINGLE") correctAnswer = values.correctSingle;
    else if (values.type === "MCQ_MULTI") correctAnswer = values.correctMulti;
    else
      correctAnswer = {
        value: values.numericalValue,
        tolerance: values.numericalTolerance ?? 0,
      };

    const payload = {
      order: values.order,
      type: values.type,
      prompt: values.prompt.trim(),
      options:
        values.type === "NUMERICAL" ? [] : values.options.map((o) => ({ id: o.id, text: o.text })),
      correctAnswer,
      marks: values.marks,
      explanation: values.explanation?.trim() || undefined,
    };
    if (isEditing && question) {
      update.mutate(
        { questionId: question.questionId, dto: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{isEditing ? "Edit question" : "Add question"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MCQ_SINGLE">MCQ — single answer</SelectItem>
                          <SelectItem value="MCQ_MULTI">MCQ — multiple answers</SelectItem>
                          <SelectItem value="NUMERICAL">Numerical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marks</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="What is the SI unit of force?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type !== "NUMERICAL" ? (
                <FormField
                  control={form.control}
                  name="options"
                  render={() => (
                    <FormItem>
                      <FormLabel>Options + correct answer</FormLabel>
                      <div className="space-y-2">
                        {type === "MCQ_SINGLE" ? (
                          <FormField
                            control={form.control}
                            name="correctSingle"
                            render={({ field: correctField }) => (
                              <RadioGroup
                                value={correctField.value}
                                onValueChange={correctField.onChange}
                                className="space-y-2"
                              >
                                {fields.map((opt, idx) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                                    <Input
                                      placeholder={`Option ${idx + 1}`}
                                      {...form.register(`options.${idx}.text`)}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => fields.length > 2 && remove(idx)}
                                      disabled={fields.length <= 2}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="correctMulti"
                            render={({ field: correctField }) => (
                              <div className="space-y-2">
                                {fields.map((opt, idx) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={correctField.value?.includes(opt.id) ?? false}
                                      onCheckedChange={(checked) => {
                                        const current = correctField.value ?? [];
                                        correctField.onChange(
                                          checked
                                            ? [...current, opt.id]
                                            : current.filter((v) => v !== opt.id)
                                        );
                                      }}
                                    />
                                    <Input
                                      placeholder={`Option ${idx + 1}`}
                                      {...form.register(`options.${idx}.text`)}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => fields.length > 2 && remove(idx)}
                                      disabled={fields.length <= 2}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ id: makeId(), text: "" })}
                        >
                          <Plus className="size-3.5 mr-1.5" />
                          Add option
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="numericalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct value</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numericalTolerance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolerance (±)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step="any" {...field} value={field.value ?? 0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explanation (shown after submit)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isEditing ? "Save" : "Add question"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
