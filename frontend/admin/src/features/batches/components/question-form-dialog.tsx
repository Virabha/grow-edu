"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
import { FormSheet } from "@/components/ui/form-sheet";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import {
  useCreateQuizQuestion,
  useUpdateQuizQuestion,
} from "../hooks/use-batches";
import type { QuizQuestion } from "../types";
import { getApiError } from "@/lib/api/errors";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

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
    if (!open) return;
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
  }, [open, question, nextOrder, form]);

  const isPending = create.isPending || update.isPending;

  async function onSubmit(values: Values) {
    try {
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
        await update.mutateAsync({ questionId: question.questionId, dto: payload });
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
      title={isEditing ? "Edit question" : "Add question"}
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditing ? "Save" : "Add"}
      submitting={isPending}
      size="lg"
    >
      <Form {...form}>
        <div className="space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className={LABEL_CLS}>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={FIELD_CLS}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MCQ_SINGLE">MCQ — single</SelectItem>
                      <SelectItem value="MCQ_MULTI">MCQ — multiple</SelectItem>
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
                  <FormLabel className={LABEL_CLS}>Marks</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
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
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLS}>Question</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    className="min-h-[72px] text-xs"
                    placeholder="What is the SI unit of force?"
                  />
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
                  <FormLabel className={LABEL_CLS}>
                    Options{" "}
                    <span className="font-normal text-muted-foreground">
                      (mark correct
                      {type === "MCQ_MULTI" ? "s" : ""})
                    </span>
                  </FormLabel>
                  <div className="space-y-1.5">
                    {type === "MCQ_SINGLE" ? (
                      <FormField
                        control={form.control}
                        name="correctSingle"
                        render={({ field: correctField }) => (
                          <RadioGroup
                            value={correctField.value}
                            onValueChange={correctField.onChange}
                            className="space-y-1.5"
                          >
                            {fields.map((opt, idx) => (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2"
                              >
                                <RadioGroupItem
                                  value={opt.id}
                                  id={`opt-${opt.id}`}
                                />
                                <Input
                                  className={FIELD_CLS}
                                  placeholder={`Option ${idx + 1}`}
                                  {...form.register(`options.${idx}.text`)}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive"
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
                          <div className="space-y-1.5">
                            {fields.map((opt, idx) => (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  checked={
                                    correctField.value?.includes(opt.id) ?? false
                                  }
                                  onCheckedChange={(checked) => {
                                    const current = correctField.value ?? [];
                                    correctField.onChange(
                                      checked
                                        ? [...current, opt.id]
                                        : current.filter((v) => v !== opt.id),
                                    );
                                  }}
                                />
                                <Input
                                  className={FIELD_CLS}
                                  placeholder={`Option ${idx + 1}`}
                                  {...form.register(`options.${idx}.text`)}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive"
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
                      className="h-8 w-full text-xs"
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
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="numericalValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>Correct value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        value={field.value ?? ""}
                        className={FIELD_CLS}
                      />
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
                    <FormLabel className={LABEL_CLS}>Tolerance (±)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        {...field}
                        value={field.value ?? 0}
                        className={FIELD_CLS}
                      />
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
                <FormLabel className={LABEL_CLS}>
                  Explanation{" "}
                  <span className="font-normal text-muted-foreground">
                    (shown after submit)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    className="min-h-[56px] text-xs"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </FormSheet>
  );
}

