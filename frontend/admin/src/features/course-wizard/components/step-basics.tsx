"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateCourse, useUpdateCourse } from "@/features/courses/hooks/use-courses";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useCourseWizard } from "../store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const basicsSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    mainCategoryId: z.string().min(1, "Please select a main category"),
    subCategoryId: z.string().optional().or(z.literal("")),
    level: z
        .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"])
        .default("BEGINNER"),
    language: z
        .string({
        required_error: "Language is required",
    })
        .min(1, "Language is required")
        .default("English"),
    thumbnail: z
        .string()
        .min(1, "Thumbnail is required. Please upload the course image."),
});
type BasicsFormData = z.infer<typeof basicsSchema>;

export function StepBasics() {
    const searchParams = useSearchParams();
    const { nextStep, setCourseId, setCourseTitle, courseId } = useCourseWizard();
    const createCourse = useCreateCourse();
    const updateCourse = useUpdateCourse();
    const { data: categories } = useCategories();
    const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<BasicsFormData>({
        resolver: zodResolver(basicsSchema),
        defaultValues: {
            language: "English",
            level: "BEGINNER",
        },
    });
    const thumbnail = watch("thumbnail");
    const mainCategoryId = watch("mainCategoryId");
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    // Derive main categories (parents with children from tree API)
    const mainCategories = useMemo(
        () => (categories || []).filter((c) => !c.parentCategoryId),
        [categories]
    );

    // Derive subcategories for selected main category
    const subCategories = useMemo(() => {
        if (!mainCategoryId) return [];
        const parent = mainCategories.find((c) => c.categoryId === mainCategoryId);
        return parent?.children || [];
    }, [mainCategoryId, mainCategories]);

    // Clear subcategory when main category changes
    useEffect(() => {
        setValue("subCategoryId", "");
    }, [mainCategoryId, setValue]);

    useEffect(() => {
        const key = searchParams.get("thumbnailKey");
        if (key) setValue("thumbnail", key, { shouldValidate: true });
    }, [searchParams, setValue]);

    const onSubmit = async (data: BasicsFormData) => {
        // Use subcategory if selected, otherwise use main category
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
                toast.success("Course draft started!");
            }
            else {
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
                toast.success("Course basics updated!");
            }
            nextStep();
        }
        catch (error) {
            toast.error("Failed to save course basics.");
        }
    };
    return (<div className="space-y-2.5">
      <div className="text-center space-y-1 mb-3">
         <h2 className="text-xl font-bold tracking-tight">Course Essentials</h2>
         <p className="text-muted-foreground text-sm">Every great course starts with a name and a mission.</p>
      </div>

      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
            <div className="space-y-1.5">
               <Label>What is the title of your course?</Label>
               <Input data-testid="course-title" placeholder="e.g. The Complete Financial Analyst Course 2024" {...register("title")}/>
               {errors.title?.message && <p className="text-destructive text-sm">{errors.title.message}</p>}
               <p className="text-xs text-muted-foreground">It's okay if you can't think of a good title now. You can change it later.</p>
            </div>

            <div className="space-y-1.5">
               <Label>What is this course about?</Label>
               <Textarea data-testid="course-description" placeholder="Describe the key value of your course in a few sentences." rows={3} {...register("description")} className="resize-none"/>
                {errors.description?.message && <p className="text-destructive text-sm">{errors.description.message}</p>}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
               <div className="space-y-2.5">
                 <FormField label="Main Category" required error={errors.mainCategoryId?.message}>
                    <Controller control={control} name="mainCategoryId" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="category-select">
                            <SelectValue placeholder="Select Main Category"/>
                          </SelectTrigger>
                          <SelectContent>
                            {mainCategories.map((cat) => (<SelectItem key={cat.categoryId} value={cat.categoryId}>
                                {cat.name}
                              </SelectItem>))}
                          </SelectContent>
                        </Select>)}/>
                  </FormField>

                  {subCategories.length > 0 && (
                    <FormField label="Sub Category" error={errors.subCategoryId?.message}>
                      <Controller control={control} name="subCategoryId" render={({ field }) => (<Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Sub Category (optional)"/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {subCategories.map((cat) => (<SelectItem key={cat.categoryId} value={cat.categoryId}>
                                  {cat.name}
                                </SelectItem>))}
                            </SelectContent>
                          </Select>)}/>
                    </FormField>
                  )}

                  <FormField label="Level" required error={errors.level?.message}>
                    <Controller control={control} name="level" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Level"/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BEGINNER">Beginner</SelectItem>
                            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                            <SelectItem value="ADVANCED">Advanced</SelectItem>
                            <SelectItem value="ALL_LEVELS">All Levels</SelectItem>
                          </SelectContent>
                        </Select>)}/>
                  </FormField>

                   <FormField label="Language" required error={errors.language?.message}>
                    <Controller control={control} name="language" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Language"/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="German">German</SelectItem>
                          </SelectContent>
                        </Select>)}/>
                  </FormField>
               </div>

               <div className="space-y-1.5">
                   <Label>Course Thumbnail</Label>
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-3 hover:bg-muted/10 transition-colors">
                         <div className="aspect-video relative rounded-lg overflow-hidden bg-muted mb-2 shadow-inner flex items-center justify-center">
                            {thumbnailPreview ? (
                              <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-muted-foreground text-sm">No image selected</span>
                            )}
                         </div>
                         <FileUpload onUploadComplete={(key, url) => {
            setValue("thumbnail", key, { shouldDirty: true, shouldValidate: true });
            setThumbnailPreview(url);
        }} folder="thumbnails" label="Select Image" className="w-full"/>
                    </div>
                     {errors.thumbnail && <p className="text-sm text-destructive mt-1">{errors.thumbnail.message}</p>}
               </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" data-testid="step-basics-continue" disabled={createCourse.isPending || updateCourse.isPending}>
                {createCourse.isPending || updateCourse.isPending ? "Saving..." : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>);
}
