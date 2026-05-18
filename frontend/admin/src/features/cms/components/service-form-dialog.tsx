"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileUpload } from "@/components/ui/file-upload";
import { SecureImage } from "@/components/ui/secure-image";
import { IconPicker } from "./icon-picker";
import { FormBuilder } from "./form-builder";
import { useCreateService, useUpdateService } from "../hooks/use-cms";
import { X } from "lucide-react";
import type { Service, FormSchema } from "../types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  screenshots: z.array(z.string()).default([]),
  iconName: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

const defaults: Values = {
  title: "",
  slug: "",
  description: "",
  imageUrl: "",
  screenshots: [],
  iconName: "BookOpen",
  displayOrder: 0,
  isActive: true,
};

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function serviceToValues(s: Service): Values {
  return {
    title: s.title,
    slug: s.slug,
    description: s.description ?? "",
    imageUrl: s.imageUrl ?? "",
    screenshots: s.screenshots ?? [],
    iconName: s.iconName ?? "BookOpen",
    displayOrder: s.displayOrder ?? 0,
    isActive: s.isActive,
  };
}

export function ServiceFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}) {
  const { open, onOpenChange, service } = props;
  const isEditing = !!service;
  const create = useCreateService();
  const update = useUpdateService();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  // Keep formSchema in local state — react-hook-form can't track deep nested objects reliably
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (service) {
      form.reset(serviceToValues(service));
      setImagePreview(service.imageUrl || null);
      setScreenshotPreviews(service.screenshots ?? []);
      setFormSchema(service.formSchema ?? null);
    } else {
      form.reset(defaults);
      setImagePreview(null);
      setScreenshotPreviews([]);
      setFormSchema(null);
    }
  }, [service, form]);

  useEffect(() => {
    if (!open) {
      form.reset(defaults);
      setImagePreview(null);
      setScreenshotPreviews([]);
      setFormSchema(null);
    }
  }, [open, form]);

  function handleRemoveScreenshot(index: number) {
    const currentScreenshots = form.getValues("screenshots");
    const updated = currentScreenshots.filter((_, i) => i !== index);
    form.setValue("screenshots", updated);
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  const isPending = create.isPending || update.isPending;

  function handleSubmitForm(values: Values) {
    const slug = values.slug.trim() || slugify(values.title);
    const payload = {
      title: values.title.trim(),
      slug,
      description: values.description?.trim() || undefined,
      imageUrl: values.imageUrl?.trim() || undefined,
      screenshots: values.screenshots.length > 0 ? values.screenshots : undefined,
      iconName: values.iconName?.trim() || undefined,
      formSchema: formSchema || null,
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };
    if (isEditing && service) {
      update.mutate({ id: service.serviceId, dto: payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Edit Service" : "Add Service"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-3">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Service title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl><Input {...field} placeholder="service-slug" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image (optional)</FormLabel>
                  <div className="space-y-2">
                    {(imagePreview || field.value) && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                        {imagePreview?.startsWith("http") || imagePreview?.startsWith("blob:") ? (
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <SecureImage src={field.value || imagePreview || ""} alt="Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    <FileUpload
                      onUploadComplete={(key, url) => {
                        field.onChange(key);
                        setImagePreview(url);
                      }}
                      folder="services"
                      label="Upload Cover Image"
                      className="w-full"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="screenshots" render={({ field }) => (
                <FormItem>
                  <FormLabel>Screenshots (upload multiple)</FormLabel>
                  <div className="space-y-2">
                    {screenshotPreviews.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {screenshotPreviews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border bg-muted group">
                            {preview.startsWith("http") || preview.startsWith("blob:") ? (
                              <img src={preview} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <SecureImage src={field.value[idx] || preview} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveScreenshot(idx)}
                              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label={`Remove screenshot ${idx + 1}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <FileUpload
                      onUploadComplete={(key, url) => {
                        const currentScreenshots = form.getValues("screenshots");
                        form.setValue("screenshots", [...currentScreenshots, key]);
                        setScreenshotPreviews((prev) => [...prev, url]);
                      }}
                      folder="services/screenshots"
                      label="Add Screenshot"
                      className="w-full"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="iconName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (optional)</FormLabel>
                  <FormControl><IconPicker value={field.value || "BookOpen"} onChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div>
                <label className="text-sm font-medium leading-none">Application Form Builder</label>
                <div className="mt-1.5">
                  <FormBuilder value={formSchema} onChange={setFormSchema} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="displayOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : isEditing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
