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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useCreateBatchAnnouncement,
  useUpdateBatchAnnouncement,
} from "../hooks/use-batches";
import type { BatchAnnouncement } from "../types";

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
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
    if (announcement) {
      form.reset({
        title: announcement.title,
        body: announcement.body,
        pinned: announcement.pinned,
      });
    } else {
      form.reset(defaults);
    }
  }, [announcement, form]);

  useEffect(() => {
    if (!open) form.reset(defaults);
  }, [open, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    if (isEditing && announcement) {
      update.mutate(
        { announcementId: announcement.announcementId, dto: values },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(values, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit announcement" : "Post announcement"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Live class postponed" />
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pinned"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Pin to top</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? "Save" : "Post"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
