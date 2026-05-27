"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSheet } from "@/components/ui/form-sheet";
import { FileUpload } from "@/components/ui/file-upload";
import { FileText } from "lucide-react";
import {
  useCreateBatchResource,
  useUpdateBatchResource,
} from "../hooks/use-batches";
import type { BatchResource, BatchResourceType, BatchSubject } from "../types";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["DPP", "NOTES", "REFERENCE"]),
  subjectId: z.string().optional(),
  fileKey: z.string().min(1, "Upload a PDF"),
  dayNumber: z.coerce.number().int().min(1).optional(),
});

type Values = z.infer<typeof schema>;
const defaults: Values = {
  title: "",
  description: "",
  type: "NOTES",
  subjectId: "",
  fileKey: "",
  dayNumber: undefined,
};

export function ResourceFormDialog(props: {
  batchId: string;
  subjects: BatchSubject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: BatchResource | null;
  defaultType?: BatchResourceType;
}) {
  const { batchId, subjects, open, onOpenChange, resource, defaultType } = props;
  const isEditing = !!resource;
  const create = useCreateBatchResource(batchId);
  const update = useUpdateBatchResource(batchId);
  const [filePreviewKey, setFilePreviewKey] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ...defaults, type: defaultType ?? "NOTES" },
  });
  const type = form.watch("type");

  useEffect(() => {
    if (!open) return;
    if (resource) {
      form.reset({
        title: resource.title,
        description: resource.description ?? "",
        type: resource.type,
        subjectId: resource.subjectId ?? "",
        fileKey: resource.fileKey,
        dayNumber: resource.dayNumber ?? undefined,
      });
      setFilePreviewKey(resource.fileKey);
    } else {
      form.reset({ ...defaults, type: defaultType ?? "NOTES" });
      setFilePreviewKey(null);
    }
  }, [open, resource, defaultType, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      type: values.type,
      subjectId: values.subjectId?.trim() || undefined,
      fileKey: values.fileKey,
      dayNumber: values.type === "DPP" ? values.dayNumber : undefined,
    };
    if (isEditing && resource) {
      update.mutate(
        { resourceId: resource.resourceId, dto: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit resource" : "Upload resource"}
      description="PDFs for DPP, notes, and references."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditing ? "Save" : "Upload"}
      submitting={isPending}
    >
      <Form {...form}>
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
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
                      <SelectItem value="DPP">DPP</SelectItem>
                      <SelectItem value="NOTES">Notes</SelectItem>
                      <SelectItem value="REFERENCE">Reference</SelectItem>
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
                    placeholder="e.g. Kinematics — DPP 01"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {type === "DPP" && (
            <FormField
              control={form.control}
              name="dayNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Day number</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value ?? ""}
                      className={FIELD_CLS}
                      placeholder="1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                    placeholder="Optional"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fileKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLS}>PDF file</FormLabel>
                {filePreviewKey && (
                  <div className="mb-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="line-clamp-1 font-mono text-[11px] text-muted-foreground">
                      {filePreviewKey.split("/").pop()}
                    </span>
                  </div>
                )}
                <FormControl>
                  <FileUpload
                    onUploadComplete={(key) => {
                      field.onChange(key);
                      setFilePreviewKey(key);
                    }}
                    folder="batch-resources"
                    label={filePreviewKey ? "Replace PDF" : "Upload PDF"}
                    accept="application/pdf"
                    compact
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
