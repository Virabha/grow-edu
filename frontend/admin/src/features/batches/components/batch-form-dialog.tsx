"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { SecureImage } from "@/components/ui/secure-image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AsyncMultiSelect,
  type AsyncMultiSelectOption,
} from "@/components/ui/async-multi-select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateBatch, useUpdateBatch } from "../hooks/use-batches";
import { usersApi } from "@/features/users/api/users.api";
import type { Batch, BatchStatus, BatchDetail } from "../types";

const schema = z
  .object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    targetExam: z.string().optional(),
    language: z.string().default("English"),
    thumbnail: z.string().optional(),
    bannerImage: z.string().optional(),
    price: z.coerce.number().min(0).default(0),
    compareAtPrice: z.coerce.number().min(0).optional(),
    currency: z.string().default("INR"),
    capacity: z.coerce.number().int().min(1).optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    categoryId: z.string().optional(),
    teacherIds: z.array(z.string()).default([]),
    status: z
      .enum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "ARCHIVED"])
      .default("DRAFT"),
  })
  .refine((v) => new Date(v.endDate) > new Date(v.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type Values = z.infer<typeof schema>;

const defaults: Values = {
  title: "",
  slug: "",
  description: "",
  shortDescription: "",
  targetExam: "",
  language: "English",
  thumbnail: "",
  bannerImage: "",
  price: 0,
  compareAtPrice: undefined,
  currency: "INR",
  capacity: undefined,
  startDate: "",
  endDate: "",
  categoryId: "",
  teacherIds: [],
  status: "DRAFT",
};

const FIELD_CLS = "h-8 text-xs";
const LABEL_CLS = "text-xs font-medium";

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const date = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-8 w-full justify-start px-3 text-left text-xs font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-3.5" />
          {date
            ? date.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={date}
          onSelect={(d) => {
            if (!d) return;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            onChange(`${yyyy}-${mm}-${dd}`);
          }}
          defaultMonth={date ?? new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function batchToValues(b: Batch): Values {
  return {
    slug: b.slug,
    title: b.title,
    price: b.price,
    status: b.status,
    language: b.language,
    currency: b.currency,
    thumbnail: b.thumbnail ?? "",
    categoryId: b.categoryId ?? "",
    endDate: toDateInput(b.endDate),
    targetExam: b.targetExam ?? "",
    description: b.description ?? "",
    bannerImage: b.bannerImage ?? "",
    capacity: b.capacity ?? undefined,
    startDate: toDateInput(b.startDate),
    shortDescription: b.shortDescription ?? "",
    compareAtPrice: b.compareAtPrice ?? undefined,
    teacherIds: b.teacherIds ?? [],
  };
}

export function BatchFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: (Batch & Partial<Pick<BatchDetail, "teachers">>) | null;
}) {
  const { open, onOpenChange, batch } = props;
  const isEditing = !!batch;
  const create = useCreateBatch();
  const update = useUpdateBatch();
  // Tracks original value so unchanged thumbnails are omitted from the PATCH (preserves storage key).
  const [thumbnailInitial, setThumbnailInitial] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<AsyncMultiSelectOption[]>(
    [],
  );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const isPending = create.isPending || update.isPending;

  function handleSubmitForm(values: Values) {
    const slug = values.slug.trim() || slugify(values.title);
    const trimmedThumb = values.thumbnail?.trim() ?? "";
    const thumbnailChanged = trimmedThumb !== (thumbnailInitial ?? "");
    const thumbnailToSend = !isEditing
      ? trimmedThumb || undefined
      : thumbnailChanged
        ? trimmedThumb || undefined
        : undefined;

    const payload = {
      title: values.title.trim(),
      slug,
      description: values.description?.trim() || undefined,
      shortDescription: values.shortDescription?.trim() || undefined,
      targetExam: values.targetExam?.trim() || undefined,
      language: values.language.trim(),
      thumbnail: thumbnailToSend,
      bannerImage: values.bannerImage?.trim() || undefined,
      price: values.price,
      compareAtPrice: values.compareAtPrice,
      currency: values.currency,
      capacity: values.capacity,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      categoryId: values.categoryId?.trim() || undefined,
      teacherIds: values.teacherIds,
      status: values.status as BatchStatus,
    };

    if (isEditing && batch)
      update.mutate(
        { batchId: batch.batchId, dto: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    else create.mutate(payload, { onSuccess: () => onOpenChange(false) });
  }

  useEffect(() => {
    if (!open) return;
    if (batch) {
      form.reset(batchToValues(batch));
      setThumbnailPreview(batch.thumbnail);
      setThumbnailInitial(batch.thumbnail ?? "");

      const resolvedTeachers = batch.teachers?.length
        ? batch.teachers
        : [];
      if (resolvedTeachers.length > 0) {
        setTeacherOptions(
          resolvedTeachers.map((t) => ({
            value: t.userId,
            label:
              [t.firstName, t.lastName].filter(Boolean).join(" ") || t.email,
            secondary: t.email,
          })),
        );
      } else {
        setTeacherOptions([]);
      }
    } else {
      form.reset(defaults);
      setThumbnailPreview(null);
      setThumbnailInitial(null);
      setTeacherOptions([]);
    }
  }, [open, batch, form]);

  const loadInstructors = useCallback(
    async (query: string): Promise<AsyncMultiSelectOption[]> => {
      const res = await usersApi.getAll({
        search: query || undefined,
        role: "INSTRUCTOR",
        limit: 20,
        page: 1,
      });
      return res.data.map((u) => ({
        value: u.id,
        label:
          [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
        secondary: u.email,
      }));
    },
    [],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Edit Batch" : "New Batch"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmitForm)}
              className="space-y-2.5 px-1"
            >
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
                        placeholder="NEET 2026 Aakarshan Batch"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Slug</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={FIELD_CLS}
                          placeholder="neet-2026-aakarshan"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetExam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Target Exam</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={FIELD_CLS}
                          placeholder="NEET 2026"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>
                      Short description
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className={FIELD_CLS}
                        placeholder="One-line pitch for cards"
                      />
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
                    <FormLabel className={LABEL_CLS}>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        className="min-h-[64px] text-xs"
                        placeholder="Detailed batch description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>Thumbnail</FormLabel>
                    <div className="space-y-2">
                      {(thumbnailPreview || field.value) && (
                        <div className="relative w-28 aspect-video rounded-lg overflow-hidden border bg-muted">
                          {thumbnailPreview?.startsWith("http") ||
                          thumbnailPreview?.startsWith("blob:") ? (
                            <img
                              src={thumbnailPreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <SecureImage
                              src={field.value || thumbnailPreview || ""}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                      <FileUpload
                        onUploadComplete={(key, url) => {
                          field.onChange(key);
                          setThumbnailPreview(url);
                        }}
                        folder="batches"
                        label="Upload thumbnail"
                        compact
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={LABEL_CLS}>Start date</FormLabel>
                      <DatePickerField
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={LABEL_CLS}>End date</FormLabel>
                      <DatePickerField
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className={FIELD_CLS}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="compareAtPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Compare price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className={FIELD_CLS}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Currency</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={FIELD_CLS}
                          placeholder="INR"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className={FIELD_CLS}
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Optional"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_CLS}>Language</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={FIELD_CLS}
                          placeholder="English"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="UPCOMING">Upcoming</SelectItem>
                        <SelectItem value="ONGOING">Ongoing</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_CLS}>Instructors</FormLabel>
                    <AsyncMultiSelect
                      value={teacherOptions}
                      onChange={(next) => {
                        setTeacherOptions(next);
                        field.onChange(next.map((o) => o.value));
                      }}
                      loadOptions={loadInstructors}
                      placeholder="Assign instructors…"
                      searchPlaceholder="Search by name or email"
                      emptyMessage="No instructors match"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isEditing ? "Save changes" : "Create batch"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
