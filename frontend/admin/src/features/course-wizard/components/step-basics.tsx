"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import {
  useCreateCourse,
  useUpdateCourse,
} from "@/features/courses/hooks/use-courses";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useCourseWizard } from "../store";
import { WizardShell } from "./wizard-shell";

const basicsSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  mainCategoryId: z.string().min(1, "Please select a main category"),
  subCategoryId: z.string().optional().or(z.literal("")),
  level: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"])
    .default("BEGINNER"),
  language: z.string().min(1, "Language is required").default("English"),
  thumbnail: z.string().min(1, "Course thumbnail is required"),
});

type BasicsFormData = z.infer<typeof basicsSchema>;

const FORM_ID = "step-basics-form";

function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function StepBasics() {
  const searchParams = useSearchParams();
  const { nextStep, setCourseId, setCourseTitle, courseId } = useCourseWizard();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const { data: categories } = useCategories();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<BasicsFormData>({
    resolver: zodResolver(basicsSchema),
    defaultValues: { language: "English", level: "BEGINNER" },
    shouldFocusError: true,
  });

  const errorCount = Object.keys(errors).length;

  const mainCategoryId = watch("mainCategoryId");
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const mainCategories = useMemo(
    () => (categories ?? []).filter((c) => !c.parentCategoryId),
    [categories],
  );

  const subCategories = useMemo(() => {
    if (!mainCategoryId) return [];
    const parent = mainCategories.find((c) => c.categoryId === mainCategoryId);
    return parent?.children ?? [];
  }, [mainCategoryId, mainCategories]);

  useEffect(() => {
    setValue("subCategoryId", "");
  }, [mainCategoryId, setValue]);

  useEffect(() => {
    const key = searchParams.get("thumbnailKey");
    if (key) setValue("thumbnail", key, { shouldValidate: true });
  }, [searchParams, setValue]);

  const isSaving = createCourse.isPending || updateCourse.isPending;

  const onSubmit = async (data: BasicsFormData) => {
    const categoryId = data.subCategoryId || data.mainCategoryId;
    try {
      if (!courseId) {
        const result = await createCourse.mutateAsync({
          title: data.title,
          description: data.description,
          shortDescription: data.description,
          categoryId,
          price: 0,
          currency: "INR",
          status: "DRAFT",
          slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          level: data.level,
          language: data.language,
          thumbnail: data.thumbnail,
        });
        setCourseId(result.courseId);
        setCourseTitle(result.title);
        toast.success("Course draft started.");
      } else {
        await updateCourse.mutateAsync({
          id: courseId,
          dto: {
            title: data.title,
            description: data.description,
            shortDescription: data.description,
            categoryId,
            slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            level: data.level,
            language: data.language,
            thumbnail: data.thumbnail,
          },
        });
        setCourseTitle(data.title);
        toast.success("Course basics updated.");
      }
      nextStep();
    } catch {
      toast.error("Couldn't save course basics.");
    }
  };

  return (
    <WizardShell
      step={1}
      eyebrow="Course basics"
      title={
        <>
          Tell us about your <em className="text-primary">course.</em>
        </>
      }
      description="The fundamentals — title, category, level. You can refine all of this later."
      submitForm={FORM_ID}
      loading={isSaving}
      hideBack
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {isSubmitted && errorCount > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            Please fix {errorCount} field
            {errorCount === 1 ? "" : "s"} before continuing.
          </div>
        )}

        <Field
          label="Title"
          required
          error={errors.title?.message}
          hint="A good title is specific and outcome-led."
          htmlFor="course-title"
        >
          <Input
            id="course-title"
            data-testid="course-title"
            placeholder="e.g. The Complete Financial Analyst Course 2026"
            {...register("title")}
          />
        </Field>

        <Field
          label="Description"
          required
          error={errors.description?.message}
          htmlFor="course-description"
        >
          <Textarea
            id="course-description"
            data-testid="course-description"
            rows={4}
            placeholder="Describe the value of your course in 2–3 sentences."
            className="resize-none"
            {...register("description")}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Field
              label="Main category"
              required
              error={errors.mainCategoryId?.message}
            >
              <Controller
                control={control}
                name="mainCategoryId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((cat) => (
                        <SelectItem key={cat.categoryId} value={cat.categoryId}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {subCategories.length > 0 && (
              <Field
                label="Sub-category (optional)"
                error={errors.subCategoryId?.message}
              >
                <Controller
                  control={control}
                  name="subCategoryId"
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
                      value={field.value || "__none__"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub-category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {subCategories.map((cat) => (
                          <SelectItem
                            key={cat.categoryId}
                            value={cat.categoryId}
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}

            <Field label="Level" required error={errors.level?.message}>
              <Controller
                control={control}
                name="level"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">Beginner</SelectItem>
                      <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                      <SelectItem value="ADVANCED">Advanced</SelectItem>
                      <SelectItem value="ALL_LEVELS">All levels</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Language" required error={errors.language?.message}>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Telugu">Telugu</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field label="Course thumbnail" required error={errors.thumbnail?.message}>
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
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
                    <span className="text-xs">No image yet</span>
                  </div>
                )}
              </div>
              <FileUpload
                onUploadComplete={(key, url) => {
                  setValue("thumbnail", key, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setThumbnailPreview(url);
                }}
                folder="thumbnails"
                label={thumbnailPreview ? "Replace image" : "Upload image"}
                className="w-full"
              />
            </div>
          </Field>
        </div>
      </form>
    </WizardShell>
  );
}
