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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSheet } from "@/components/ui/form-sheet";
import { useCourses } from "@/features/courses/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
} from "../hooks/use-announcements";
import type { CourseAnnouncementWithCourse } from "../types";

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

const schema = z.object({
  courseId: z.string().min(1, "Please select a course"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  body: z
    .string()
    .min(1, "Message is required")
    .max(10000, "Message must be 10 000 characters or fewer"),
});

type Values = z.infer<typeof schema>;
const defaults: Values = { courseId: "", title: "", body: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: CourseAnnouncementWithCourse | null;
}

export function AnnouncementFormSheet({
  open,
  onOpenChange,
  announcement,
}: Props) {
  const isEditing = !!announcement;
  const { user } = useAuthStore();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();

  const { data: coursesData } = useCourses({
    enabled: open,
    filters: { instructorId: user?.id, limit: 100 },
  });
  const courses = coursesData?.data ?? [];

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (announcement) {
      form.reset({
        courseId: announcement.courseId,
        title: announcement.title,
        body: announcement.body,
      });
    } else {
      form.reset(defaults);
    }
  }, [open, announcement, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    if (isEditing && announcement) {
      update.mutate(
        {
          announcementId: announcement.announcementId,
          dto: { title: values.title, body: values.body },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        {
          courseId: values.courseId,
          dto: { title: values.title, body: values.body },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit announcement" : "Create announcement"}
      description="Notify all enrolled students in the selected course."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={isEditing ? "Save changes" : "Post"}
      submitting={isPending}
      size="md"
    >
      <Form {...form}>
        <div className="space-y-3">
          {/* Course selector — hidden when editing (course is locked) */}
          {!isEditing && (
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_CLS}>Course</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className={FIELD_CLS}>
                        <SelectValue placeholder="Select a course…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.courseId} value={c.courseId}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                    placeholder="e.g. Live class rescheduled"
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
                    rows={8}
                    className="min-h-[160px] text-xs"
                    placeholder="Write your announcement here…"
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
