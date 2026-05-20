"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  BookOpen as BookIcon,
  ImageIcon,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { PageTransition } from "@/components/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { BackButton } from "@/components/ui/back-button";
import { CourseLoading } from "@/components/ui/course-loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { DynamicList } from "@/components/ui/dynamic-list";

import {
  useCourse,
  useUpdateCourse,
  useSubmitCourseForReview,
} from "@/features/courses/hooks/use-courses";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { CourseBuilder } from "@/features/courses/components/course-builder";
import type { UpdateCourseDto } from "@/lib/api/services/courses";
import { generateSlug, getApiErrorMessage } from "@/lib/utils";

const LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All levels" },
] as const;

const LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Spanish",
  "French",
  "German",
] as const;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const detailsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(120, "Slug must be 120 characters or less")
    .regex(SLUG_REGEX, "Lowercase letters, numbers, and hyphens only"),
  shortDescription: z
    .string()
    .max(200, "Card preview must be 200 characters or less")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters"),
  thumbnail: z.string().optional().or(z.literal("")),
  mainCategoryId: z.string().min(1, "Main category is required"),
  subCategoryId: z.string().optional().or(z.literal("")),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]),
  language: z.string().min(1, "Language is required"),
});

const pricingSchema = z.object({
  price: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0, "Price must be 0 or more"),
  ),
  compareAtPrice: z
    .preprocess(
      (v) =>
        v === "" || v == null || (typeof v === "number" && Number.isNaN(v))
          ? undefined
          : typeof v === "string"
            ? Number(v)
            : v,
      z.number().min(0).optional(),
    )
    .optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;
type PricingForm = z.infer<typeof pricingSchema>;

export default function CourseEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();

  const { data: course, isLoading } = useCourse({ enabled: true, courseId });
  const { data: categories } = useCategories();
  const updateCourse = useUpdateCourse();
  const submitForReview = useSubmitCourseForReview();

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const mainCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.parentCategoryId),
    [categories],
  );

  // ── Details form ────────────────────────────────────────────────────
  const detailsForm = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      title: "",
      slug: "",
      shortDescription: "",
      description: "",
      thumbnail: "",
      mainCategoryId: "",
      subCategoryId: "",
      level: "BEGINNER",
      language: "English",
    },
  });

  const watchedMainCategory = detailsForm.watch("mainCategoryId");
  const subCategories = useMemo(() => {
    const parent = mainCategories.find(
      (c) => c.categoryId === watchedMainCategory,
    );
    return parent?.children ?? [];
  }, [mainCategories, watchedMainCategory]);

  // ── Pricing form ────────────────────────────────────────────────────
  const pricingForm = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    defaultValues: { price: 0, compareAtPrice: undefined },
  });

  // ── Audience state ──────────────────────────────────────────────────
  const [outcomes, setOutcomes] = useState<string[]>([""]);
  const [audience, setAudience] = useState<string[]>([""]);
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [audienceSaving, setAudienceSaving] = useState(false);

  // ── Hydrate from server ─────────────────────────────────────────────
  useEffect(() => {
    if (!course) return;

    // Resolve main + sub from current categoryId
    let mainId = course.categoryId;
    let subId: string | undefined;
    const cat = (categories ?? []).find(
      (c) => c.categoryId === course.categoryId,
    );
    if (cat?.parentCategoryId) {
      mainId = cat.parentCategoryId;
      subId = cat.categoryId;
    }

    detailsForm.reset({
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription || "",
      description: course.description,
      thumbnail: course.thumbnail || "",
      mainCategoryId: mainId,
      subCategoryId: subId || "",
      level: (course.level as DetailsForm["level"]) || "BEGINNER",
      language: course.language || "English",
    });
    setThumbnailPreview(course.thumbnail || null);

    pricingForm.reset({
      price: parseFloat(course.price),
      compareAtPrice: course.compareAtPrice
        ? parseFloat(String(course.compareAtPrice))
        : undefined,
    });

    if (course.learningOutcomes?.length)
      setOutcomes(course.learningOutcomes);
    if (course.targetAudience?.length) setAudience(course.targetAudience);
    if (course.requirements?.length) setRequirements(course.requirements);
  }, [course, categories, detailsForm, pricingForm]);

  if (isLoading) return <CourseLoading type="edit" />;
  if (!course) {
    return (
      <PageLayout header="Course not found">
        <EmptyState
          title="Course not found"
          description="This course doesn't exist or you can't access it."
          icon={<BookIcon className="h-12 w-12" />}
        />
      </PageLayout>
    );
  }

  const submitDetails = detailsForm.handleSubmit(async (values) => {
    const categoryId = values.subCategoryId || values.mainCategoryId;
    const dto: UpdateCourseDto = {
      title: values.title,
      slug: values.slug,
      shortDescription: values.shortDescription?.trim() || undefined,
      description: values.description,
      thumbnail: values.thumbnail || undefined,
      categoryId,
      level: values.level,
      language: values.language,
      currency: "INR",
    };
    try {
      await updateCourse.mutateAsync({ id: courseId, dto });
      toast.success("Details saved.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Save failed"));
    }
  });

  const submitPricing = pricingForm.handleSubmit(async (values) => {
    const compare = values.compareAtPrice;
    if (compare !== undefined && compare < values.price) {
      toast.error("Strike-through price must be greater than the final price.");
      return;
    }
    try {
      await updateCourse.mutateAsync({
        id: courseId,
        dto: {
          price: values.price,
          compareAtPrice: compare,
          currency: "INR",
        },
      });
      toast.success("Pricing saved.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save pricing."));
    }
  });

  const saveAudience = async () => {
    setAudienceSaving(true);
    try {
      await updateCourse.mutateAsync({
        id: courseId,
        dto: {
          learningOutcomes: outcomes.filter((s) => s.trim() !== ""),
          targetAudience: audience.filter((s) => s.trim() !== ""),
          requirements: requirements.filter((s) => s.trim() !== ""),
        },
      });
      toast.success("Audience details saved.");
    } catch {
      toast.error("Couldn't save audience details.");
    } finally {
      setAudienceSaving(false);
    }
  };

  const setStatus = async (
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  ) => {
    try {
      await updateCourse.mutateAsync({ id: courseId, dto: { status } });
      toast.success(`Status set to ${status.toLowerCase()}.`);
    } catch {
      toast.error("Couldn't change status.");
    }
  };

  const onSubmitReview = async () => {
    try {
      await submitForReview.mutateAsync(courseId);
      toast.success("Submitted for review.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Submission failed."));
    }
  };

  return (
    <PageTransition>
      <PageLayout
        subtitle="Course management"
        header={course.title}
        description="Edit details, audience, pricing, curriculum and visibility."
        enableTransition={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BackButton href="/instructor/courses" />
            <Button
              variant="outline"
              size="sm"
              onClick={onSubmitReview}
              disabled={
                submitForReview.isPending ||
                course.reviewStatus === "PENDING_REVIEW"
              }
              className="gap-1.5"
            >
              {submitForReview.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {course.reviewStatus === "PENDING_REVIEW"
                ? "Under review"
                : "Submit for review"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-display">
              {course.reviewStatus || "DRAFT"}
            </Badge>
            {course.status === "PUBLISHED" && (
              <Badge className="bg-primary text-primary-foreground">
                Published
              </Badge>
            )}
            {course.rejectionReason && (
              <Badge variant="destructive">Changes requested</Badge>
            )}
          </div>

          {course.rejectionReason && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive">
              <p className="font-display font-medium">
                Reviewer&apos;s note
              </p>
              <p className="mt-1">{course.rejectionReason}</p>
            </div>
          )}

          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="flex w-full flex-wrap gap-1 sm:w-auto">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* ── Details ──────────────────────────────────────────── */}
            <TabsContent value="details">
              <form
                onSubmit={submitDetails}
                className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="title"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="Course title"
                    {...detailsForm.register("title")}
                  />
                  {detailsForm.formState.errors.title && (
                    <p className="text-xs text-destructive">
                      {detailsForm.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="slug"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      URL slug
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const t = detailsForm.getValues("title");
                        if (!t) return;
                        detailsForm.setValue("slug", generateSlug(t), {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      className="text-[10px] font-medium uppercase tracking-widest text-primary hover:underline"
                    >
                      Generate from title
                    </button>
                  </div>
                  <Input
                    id="slug"
                    placeholder="my-course-title"
                    className="font-mono text-sm"
                    {...detailsForm.register("slug")}
                  />
                  {detailsForm.formState.errors.slug ? (
                    <p className="text-xs text-destructive">
                      {detailsForm.formState.errors.slug.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Used in the public URL. Changing this breaks old links.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="short-description"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Card preview (optional)
                  </Label>
                  <Textarea
                    id="short-description"
                    rows={2}
                    maxLength={200}
                    placeholder="One-liner shown on catalogue cards."
                    className="resize-none"
                    {...detailsForm.register("shortDescription")}
                  />
                  {detailsForm.formState.errors.shortDescription ? (
                    <p className="text-xs text-destructive">
                      {detailsForm.formState.errors.shortDescription.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Leave blank to use the start of the full description.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="description"
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Full description
                  </Label>
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="Describe the value of the course in detail — what learners walk away with, prerequisites, the journey."
                    className="resize-none"
                    {...detailsForm.register("description")}
                  />
                  {detailsForm.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {detailsForm.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Main category
                      </Label>
                      <Controller
                        control={detailsForm.control}
                        name="mainCategoryId"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {mainCategories.map((c) => (
                                <SelectItem
                                  key={c.categoryId}
                                  value={c.categoryId}
                                >
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {detailsForm.formState.errors.mainCategoryId && (
                        <p className="text-xs text-destructive">
                          {detailsForm.formState.errors.mainCategoryId.message}
                        </p>
                      )}
                    </div>

                    {subCategories.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Sub-category (optional)
                        </Label>
                        <Controller
                          control={detailsForm.control}
                          name="subCategoryId"
                          render={({ field }) => (
                            <Select
                              value={field.value || "__none__"}
                              onValueChange={(v) =>
                                field.onChange(v === "__none__" ? "" : v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub-category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {subCategories.map((c) => (
                                  <SelectItem
                                    key={c.categoryId}
                                    value={c.categoryId}
                                  >
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Level
                        </Label>
                        <Controller
                          control={detailsForm.control}
                          name="level"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Level" />
                              </SelectTrigger>
                              <SelectContent>
                                {LEVELS.map((l) => (
                                  <SelectItem key={l.value} value={l.value}>
                                    {l.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Language
                        </Label>
                        <Controller
                          control={detailsForm.control}
                          name="language"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Language" />
                              </SelectTrigger>
                              <SelectContent>
                                {LANGUAGES.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Thumbnail
                    </Label>
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-3">
                      <div className="relative mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-background">
                        {thumbnailPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground/70">
                            <ImageIcon className="size-7" />
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <FileUpload
                          onUploadComplete={(key, url) => {
                            detailsForm.setValue("thumbnail", key, {
                              shouldDirty: true,
                            });
                            setThumbnailPreview(url);
                          }}
                          folder="thumbnails"
                          label={thumbnailPreview ? "Replace" : "Upload"}
                          className="flex-1"
                        />
                        {thumbnailPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              detailsForm.setValue("thumbnail", "", {
                                shouldDirty: true,
                              });
                              setThumbnailPreview(null);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateCourse.isPending} className="gap-1.5">
                    {updateCourse.isPending && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Save details
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* ── Audience ─────────────────────────────────────────── */}
            <TabsContent value="audience">
              <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <DynamicList
                  label="What learners will be able to do"
                  placeholder="e.g. Build a full-stack application from scratch"
                  items={outcomes}
                  onChange={setOutcomes}
                />
                <DynamicList
                  label="Who this course is for"
                  placeholder="e.g. Beginners interested in web development"
                  items={audience}
                  onChange={setAudience}
                />
                <DynamicList
                  label="Prerequisites"
                  placeholder="e.g. Basic HTML & CSS"
                  items={requirements}
                  onChange={setRequirements}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={saveAudience}
                    disabled={audienceSaving}
                    className="gap-1.5"
                  >
                    {audienceSaving && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Save audience
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ── Pricing ──────────────────────────────────────────── */}
            <TabsContent value="pricing">
              <form
                onSubmit={submitPricing}
                className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="price"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Final price (INR)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      {...pricingForm.register("price", { valueAsNumber: true })}
                    />
                    {pricingForm.formState.errors.price && (
                      <p className="text-xs text-destructive">
                        {pricingForm.formState.errors.price.message}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Use 0 for a free course.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="strike"
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Strike-through price (optional)
                    </Label>
                    <Input
                      id="strike"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      {...pricingForm.register("compareAtPrice", {
                        valueAsNumber: true,
                      })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Shown crossed-out next to the final price.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                  Instructor revenue share:{" "}
                  <span className="font-medium text-foreground">80%</span> of
                  every paid enrolment.
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateCourse.isPending} className="gap-1.5">
                    {updateCourse.isPending && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Save pricing
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* ── Curriculum ───────────────────────────────────────── */}
            <TabsContent value="curriculum">
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <CourseBuilder courseId={courseId} />
              </div>
            </TabsContent>

            {/* ── Settings ─────────────────────────────────────────── */}
            <TabsContent value="settings">
              <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Publication status
                  </Label>
                  <Select
                    value={course.status}
                    onValueChange={(v: "DRAFT" | "PUBLISHED" | "ARCHIVED") =>
                      setStatus(v)
                    }
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft (private)</SelectItem>
                      <SelectItem value="PUBLISHED">
                        Published (public)
                      </SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Publishing makes the course visible to learners. Submit
                    for review first to get the &ldquo;Approved&rdquo; badge.
                  </p>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="font-display text-base font-medium text-foreground">
                    Danger zone
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Archived courses no longer appear in catalogue searches but
                    remain accessible to existing learners. There is no
                    in-platform delete — contact admin if you need permanent
                    removal.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStatus("ARCHIVED")}
                    disabled={course.status === "ARCHIVED"}
                    className="mt-3"
                  >
                    {course.status === "ARCHIVED"
                      ? "Already archived"
                      : "Archive course"}
                  </Button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/instructor/courses")}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageLayout>
    </PageTransition>
  );
}
