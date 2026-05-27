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
import { FormSheet } from "@/components/ui/form-sheet";
import {
  useCreateBatchAnnouncement,
  useUpdateBatchAnnouncement,
} from "../hooks/use-batches";
import type { BatchAnnouncement } from "../types";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required"),
  pinned: z.boolean().default(false),
});

type Values = z.infer<typeof schema>;
const defaults: Values = { title: "", body: "", pinned: false };

export function AnnouncementFormDialog(props: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: BatchAnnouncement | null;
}) {
  const { batchId, open, onOpenChange, announcement } = props;
  const isEditing = !!announcement;
  const create = useCreateBatchAnnouncement(batchId);
  const update = useUpdateBatchAnnouncement(batchId);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (announcement) {
      form.reset({
        title: announcement.title,
        body: announcement.body,
        pinned: announcement.pinned,
      });
    } else {
      form.reset(defaults);
    }
  }, [open, announcement, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    if (isEditing && announcement) {
      update.mutate(
        { announcementId: announcement.announcementId, dto: values },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(values, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit announcement" : "Post announcement"}
      description="Notify enrolled students and trigger an email."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditing ? "Save" : "Post"}
      submitting={isPending}
      size="sm"
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
                    placeholder="Live class postponed"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLS}>Message</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={6}
                    className="min-h-[120px] text-xs"
                    placeholder="What's the update?"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pinned"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 pt-2">
                <FormLabel className={LABEL_CLS}>Pin to top</FormLabel>
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
      </Form>
    </FormSheet>
  );
}
