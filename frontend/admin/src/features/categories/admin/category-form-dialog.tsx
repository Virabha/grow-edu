"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { SecureImage } from "@/components/ui/secure-image";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import { useCreateCategory, useUpdateCategory, useAdminCategories } from "./hooks";
import type { AdminCategory } from "./types";
import { getApiError } from "@/lib/api/errors";

const schema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  slug: z.string().min(2).max(80).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  parentCategoryId: z.string().nullable().optional(),
  imageUrl: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

const defaults: Values = {
  name: "",
  slug: "",
  description: "",
  displayOrder: 0,
  isActive: true,
  parentCategoryId: null,
  imageUrl: "",
};

function categoryToValues(c: AdminCategory): Values {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description || "",
    displayOrder: c.displayOrder ?? 0,
    isActive: c.isActive,
    parentCategoryId: c.parentCategoryId || null,
    imageUrl: c.imageUrl || "",
  };
}

export function CategoryFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AdminCategory | null;
}) {
  const { open, onOpenChange, category } = props;
  const isEditing = !!category;
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const { data: allCategoriesData } = useAdminCategories({ limit: 200 });
  const parentCategories = (allCategoriesData?.data || []).filter(
    (c) => !c.parentCategoryId && c.categoryId !== category?.categoryId,
  );

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(category ? categoryToValues(category) : defaults);
    setImagePreview(category?.imageUrl || null);
  }, [category, form]);

  useEffect(() => {
    if (!open) {
      form.reset(defaults);
      setImagePreview(null);
    }
  }, [open, form]);

  const isPending = create.isPending || update.isPending;

  const onSubmit = async (values: Values) => {
    try {
      const payload = {
        name: values.name,
        slug: values.slug?.trim() || undefined,
        description: values.description?.trim() || undefined,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
        parentCategoryId: values.parentCategoryId || null,
        imageUrl: values.imageUrl?.trim() || undefined,
      };
      if (isEditing && category) {
        await update.mutateAsync({ categoryId: category.categoryId, dto: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      const apiError = getApiError(err);
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        form.setError(field as FieldPath<Values>, { type: "server", message });
      }
      if (Object.keys(apiError.fieldErrors).length === 0) {
        toast.error(apiError.message);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>
            {isEditing ? "Edit Category" : "Add Category"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Web Development" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="auto-generated from name" {...field} />
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
                      <Input placeholder="Short description for listings" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (root category)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None (root category)</SelectItem>
                        {parentCategories.map((cat) => (
                          <SelectItem key={cat.categoryId} value={cat.categoryId}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Leave as "None" for a main category, or pick a parent to create a subcategory.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <div className="space-y-2">
                      {(imagePreview || field.value) && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                          {imagePreview?.startsWith("http") || imagePreview?.startsWith("blob:") ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <SecureImage
                              src={field.value || imagePreview || ""}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                      <FileUpload
                        onUploadComplete={(key, url) => {
                          field.onChange(key);
                          setImagePreview(url);
                        }}
                        folder="categories"
                        label="Upload Image"
                        className="w-full"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 pt-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
