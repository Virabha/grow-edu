"use client";
import { use, useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { useCourse, useUpdateCourse, useSubmitCourseForReview, } from "@/features/courses/hooks/use-courses";
import type { UpdateCourseDto } from "@/lib/api/services/courses";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen as BookIcon, ImageIcon, Trash2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { CourseLoading } from "@/components/ui/course-loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateSlug } from "@/lib/utils";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { FormField } from "@/components/ui/form-field";
import { FileUpload } from "@/components/ui/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseBuilder } from "@/features/courses/components/course-builder";
import type { AxiosError } from "axios";
const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    // Keep in sync with backend UpdateCourseDto (@MinLength(10))
    description: z.string().min(10, "Description must be at least 10 characters"),
    price: z.preprocess((v) => (typeof v === "number" && !Number.isFinite(v) ? undefined : v), z.number().min(0, "Price must be positive")),
    compareAtPrice: z.preprocess((v) => (typeof v === "number" && !Number.isFinite(v) ? undefined : v), z.number().min(0, "Original price must be positive").optional()),
    currency: z.string().min(1, "Currency is required"),
    thumbnail: z
        .string()
        .min(1)
        .optional()
        .or(z.literal(""))
        .transform((val) => val === "" ? undefined : val),
    categoryId: z.string().min(1, "Category is required"),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});
export default function CourseEditPage({ params, }: {
    params: Promise<{
        courseId: string;
    }>;
}) {
    const { courseId } = use(params);
    const [mounted, setMounted] = useState(false);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const { data: course, isLoading } = useCourse({ enabled: true, courseId });
    const { data: categories } = useCategories();
    const updateCourse = useUpdateCourse();
    const submitForReview = useSubmitCourseForReview();
    const router = useRouter();
    useEffect(() => {
        setMounted(true);
    }, []);
    const { register, handleSubmit, formState: { errors }, reset, setValue, watch, } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            price: 0,
            compareAtPrice: undefined,
            currency: "INR",
            thumbnail: "",
            categoryId: "",
            status: "DRAFT",
        },
    });
    useEffect(() => {
        if (course) {
            reset({
                title: course.title,
                description: course.description,
                price: parseFloat(course.price),
                compareAtPrice: course.compareAtPrice ? parseFloat(String(course.compareAtPrice)) : undefined,
                currency: "INR",
                thumbnail: course.thumbnail || "",
                categoryId: course.categoryId,
                status: course.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
            });
            if (course.thumbnail) {
                setThumbnailPreview(course.thumbnail);
            }
        }
    }, [course, reset]);
    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!courseId) {
            toast.error("Course ID is missing. Please reload and try again.");
            return;
        }
        try {
            const slug = generateSlug(values.title);
            const dto: UpdateCourseDto = {
                ...values,
                currency: "INR",
                shortDescription: values.description,
                slug,
                thumbnail: values.thumbnail ?? undefined,
            };
            if (dto.compareAtPrice !== undefined && !Number.isFinite(dto.compareAtPrice)) {
                delete dto.compareAtPrice;
            }
            await updateCourse.mutateAsync({
                id: courseId,
                dto,
            });
            router.push("/instructor/courses");
        }
        catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string | string[] }>;
            const serverMessage = axiosError?.response?.data?.message;
            const errorMessage = Array.isArray(serverMessage)
                ? serverMessage.join(", ")
                : typeof serverMessage === "string"
                    ? serverMessage
                    : error instanceof Error
                        ? error.message
                        : "Failed to update course";
            toast.error(errorMessage);
        }
    }
    if (isLoading) {
        return <CourseLoading type="edit"/>;
    }
    if (!course) {
        return (<PageLayout header="Course Not Found">
        <EmptyState title="Course not found" description="The course you're looking for doesn't exist." icon={<BookIcon className="h-12 w-12"/>}/>
      </PageLayout>);
    }
    return (<PageTransition>
      <PageLayout header={`Edit Course: ${course.title}`} subtitle="Course Management" description="Update your course details, curriculum, and settings." enableTransition={false} actions={<BackButton href="/instructor/courses"/>}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{course.reviewStatus || "DRAFT"}</Badge>
            {course.status === "PUBLISHED" && (<Badge className="bg-green-500">Published</Badge>)}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={submitForReview.isPending ||
            course.reviewStatus === "PENDING_REVIEW"} onClick={async () => {
            if (!courseId)
                return;
            await submitForReview.mutateAsync(courseId);
        }} className="w-full sm:w-auto">
              {submitForReview.isPending
            ? "Submitting..."
            : "Submit for Review"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-2.5">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
                <CardDescription>
                  Update your course information
                </CardDescription>
                {course.rejectionReason && (<div className="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded-md">
                    <strong>Rejection Reason:</strong> {course.rejectionReason}
                  </div>)}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
                  
                  <input type="hidden" {...register("categoryId")} value={watch("categoryId") || ""}/>
                  <input type="hidden" {...register("status")} value={watch("status") || "DRAFT"}/>
                  <input type="hidden" {...register("currency")} value="INR"/>
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" placeholder="Course title" {...register("title")}/>
                    {errors.title && (<p className="text-xs text-destructive">
                        {errors.title.message}
                      </p>)}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Course Thumbnail</Label>
                    <div className="max-w-md">
                      {thumbnailPreview ? (
                        <div className="relative group rounded-lg overflow-hidden border border-border">
                          <img
                            src={thumbnailPreview}
                            alt="Course thumbnail"
                            className="w-full aspect-video object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/90 transition-colors">
                              Change
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  formData.append("folder", "thumbnails");
                                  try {
                                    const { apiClient } = await import("@/lib/api/client");
                                    const { data } = await apiClient.post<{ url: string; key: string }>("/files/storage/upload-url", formData, {
                                      headers: { "Content-Type": "multipart/form-data" },
                                    });
                                    setValue("thumbnail", data.key, { shouldDirty: true });
                                    setThumbnailPreview(data.url);
                                    toast.success("Thumbnail updated");
                                  } catch {
                                    toast.error("Failed to upload thumbnail");
                                  }
                                }}
                              />
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => {
                                setValue("thumbnail", "", { shouldDirty: true });
                                setThumbnailPreview(null);
                              }}
                            >
                              <Trash2 className="size-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <FileUpload
                          onUploadComplete={(key, url) => {
                            setValue("thumbnail", key, { shouldDirty: true });
                            setThumbnailPreview(url);
                          }}
                          folder="thumbnails"
                          label="Upload course thumbnail"
                          className="w-full"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Course description" {...register("description")}/>
                    {errors.description && (<p className="text-xs text-destructive">
                        {errors.description.message}
                      </p>)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="price">Final Price (INR)</Label>
                      <Input id="price" type="number" step="0.01" placeholder="0.00" {...register("price", { valueAsNumber: true })}/>
                      {errors.price && (<p className="text-xs text-destructive">
                          {errors.price.message}
                        </p>)}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="compareAtPrice">Original Price (INR) (optional)</Label>
                      <Input id="compareAtPrice" type="number" step="0.01" placeholder="0.00" {...register("compareAtPrice", { valueAsNumber: true })}/>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="categoryId">Category</Label>
                    {mounted ? (<Select value={watch("categoryId")} onValueChange={(value) => setValue("categoryId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category"/>
                        </SelectTrigger>
                        <SelectContent>
                          {categories && categories.length > 0 ? (categories.map((category) => (<SelectItem key={category.categoryId} value={category.categoryId}>
                                {category.name}
                              </SelectItem>))) : (<SelectItem value="none" disabled>
                              No categories available
                            </SelectItem>)}
                        </SelectContent>
                      </Select>) : (<div className="h-10 w-full bg-muted animate-pulse rounded-md"/>)}
                    {errors.categoryId && (<p className="text-xs text-destructive">
                        {errors.categoryId.message}
                      </p>)}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={updateCourse.isPending}>
                      {updateCourse.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum">
            <CourseBuilder courseId={courseId}/>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>
                  Manage publication status and other settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="status">Publication Status</Label>
                  {mounted ? (<Select value={watch("status") || "DRAFT"} onValueChange={async (value: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
                setValue("status", value);
                await updateCourse.mutateAsync({
                    id: courseId,
                    dto: { status: value },
                });
                toast.success(`Status updated to ${value}`);
            }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>) : (<div className="h-10 w-full bg-muted animate-pulse rounded-md"/>)}
                  <p className="text-xs text-muted-foreground">
                    Note: Publishing a course will make it visible to students
                    immediately if approved.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </PageTransition>);
}
