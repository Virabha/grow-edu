"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import {
  useCreateBatchResource,
  useUpdateBatchResource,
} from "../hooks/use-batches";
import type { BatchResource, BatchResourceType, BatchSubject } from "../types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["DPP", "NOTES", "REFERENCE"]),
  subjectId: z.string().optional(),
  fileKey: z.string().min(1, "Upload a file"),
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
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ...defaults, type: defaultType ?? "NOTES" },
  });
  const type = form.watch("type");

  useEffect(() => {
    if (resource) {
      form.reset({
        title: resource.title,
        description: resource.description ?? "",
        type: resource.type,
        subjectId: resource.subjectId ?? "",
        fileKey: resource.fileKey,
        dayNumber: resource.dayNumber ?? undefined,
      });
      setFilePreview(resource.fileUrl);
    } else {
      form.reset({ ...defaults, type: defaultType ?? "NOTES" });
      setFilePreview(null);
    }
  }, [resource, defaultType, form]);

  useEffect(() => {
    if (!open) {
      form.reset({ ...defaults, type: defaultType ?? "NOTES" });
      setFilePreview(null);
    }
  }, [open, defaultType, form]);

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
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit resource" : "Upload resource"}
          </DialogTitle>
        </DialogHeader>
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
                      <SelectItem value="DPP">DPP (daily practice)</SelectItem>
                      <SelectItem value="NOTES">Notes / Study material</SelectItem>
                      <SelectItem value="REFERENCE">Reference</SelectItem>
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
                    <Input {...field} placeholder="e.g. Kinematics — DPP 01" />
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
            <div className="grid grid-cols-2 gap-3">
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
              {type === "DPP" && (
                <FormField
                  control={form.control}
                  name="dayNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day number</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <FormField
              control={form.control}
              name="fileKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PDF file</FormLabel>
                  <div className="space-y-2">
                    {(filePreview || field.value) && (
                      <p className="rounded-lg border border-dashed border-border bg-muted/40 p-2 text-xs text-muted-foreground line-clamp-1">
                        {field.value}
                      </p>
                    )}
                    <FileUpload
                      onUploadComplete={(key, url) => {
                        field.onChange(key);
                        setFilePreview(url);
                      }}
                      folder="batch-resources"
                      label="Upload PDF"
                      accept="application/pdf"
                      className="w-full"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? "Save" : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
