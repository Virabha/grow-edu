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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCreateBatchSubject,
  useUpdateBatchSubject,
} from "../hooks/use-batches";
import type { BatchSubject } from "../types";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

const DEFAULT_COLOR = "#2563eb";

const PRESET_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#dc2626", // red
  "#ea580c", // orange
  "#ca8a04", // amber
  "#16a34a", // green
  "#0891b2", // cyan
  "#475569", // slate
  "#1e293b", // dark
];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional()
    .or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

type Values = z.infer<typeof schema>;

const defaults: Values = { name: "", color: DEFAULT_COLOR, displayOrder: 0 };

function ColorPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const current = value || DEFAULT_COLOR;
  return (
    <div className="flex items-center gap-2">
      <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-input shadow-sm">
        <span
          className="block h-full w-full rounded-[5px]"
          style={{ background: current }}
        />
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <span className="font-mono text-xs uppercase text-muted-foreground tabular-nums">
        {current}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {PRESET_COLORS.map((c) => {
          const isActive = current.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange(c)}
              className={cn(
                "size-4 rounded-full border border-border/60 transition-transform hover:scale-110",
                isActive && "ring-2 ring-offset-1 ring-offset-background",
              )}
              style={{
                background: c,
                boxShadow: isActive ? `0 0 0 1.5px ${c}` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SubjectFormDialog(props: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: BatchSubject | null;
}) {
  const { batchId, open, onOpenChange, subject } = props;
  const isEditing = !!subject;
  const create = useCreateBatchSubject(batchId);
  const update = useUpdateBatchSubject(batchId);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (subject) {
      form.reset({
        name: subject.name,
        color: subject.color ?? DEFAULT_COLOR,
        displayOrder: subject.displayOrder,
      });
    } else {
      form.reset(defaults);
    }
  }, [open, subject, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    const payload = {
      name: values.name.trim(),
      color: values.color?.trim() || undefined,
      displayOrder: values.displayOrder,
    };
    if (isEditing && subject) {
      update.mutate(
        { subjectId: subject.subjectId, dto: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Name</FormLabel>
                  <FormControl>
                    <Input {...field} className={FIELD_CLS} placeholder="Physics" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Color</FormLabel>
                  <FormControl>
                    <ColorPickerField
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      className={cn(FIELD_CLS, "w-24")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isEditing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
