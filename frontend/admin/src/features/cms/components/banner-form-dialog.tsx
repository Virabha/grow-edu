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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { FileUpload } from "@/components/ui/file-upload";
import { SecureImage } from "@/components/ui/secure-image";
import { useCreateBanner, useUpdateBanner } from "../hooks/use-cms";
import type { Banner } from "../types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().min(1, "Image URL is required"),
  overlayColor: z.string().optional(),
  overlayOpacity: z.coerce.number().min(0).max(100).default(40),
  textColor: z.string().optional(),
  textAlign: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  ctaStyle: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaLink: z.string().optional(),
  badgeText: z.string().optional(),
  badgeColor: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

const defaults: Values = {
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  overlayColor: "rgba(0,0,0,0.4)",
  overlayOpacity: 40,
  textColor: "#ffffff",
  textAlign: "left",
  ctaText: "",
  ctaLink: "",
  ctaStyle: "primary",
  secondaryCtaText: "",
  secondaryCtaLink: "",
  badgeText: "",
  badgeColor: "",
  displayOrder: 0,
  isActive: true,
};

function bannerToValues(b: Banner): Values {
  return {
    title: b.title,
    subtitle: b.subtitle ?? "",
    description: b.description ?? "",
    imageUrl: b.imageUrl,
    overlayColor: b.overlayColor ?? "rgba(0,0,0,0.4)",
    overlayOpacity: b.overlayOpacity ?? 40,
    textColor: b.textColor ?? "#ffffff",
    textAlign: b.textAlign ?? "left",
    ctaText: b.ctaText ?? "",
    ctaLink: b.ctaLink ?? "",
    ctaStyle: b.ctaStyle ?? "primary",
    secondaryCtaText: b.secondaryCtaText ?? "",
    secondaryCtaLink: b.secondaryCtaLink ?? "",
    badgeText: b.badgeText ?? "",
    badgeColor: b.badgeColor ?? "",
    displayOrder: b.displayOrder,
    isActive: b.isActive,
  };
}

export function BannerFormDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  banner?: Banner | null;
}) {
  const { open, onOpenChange, banner } = props;
  const isEditing = !!banner;
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(banner ? bannerToValues(banner) : defaults);
    setImagePreview(banner?.imageUrl || null);
  }, [banner, form]);

  useEffect(() => {
    if (!open) { form.reset(defaults); setImagePreview(null); }
  }, [open, form]);

  const onSubmit = async (values: Values) => {
    const clean = (v: string | undefined) => v?.trim() || undefined;
    const payload = {
      title: values.title.trim(),
      subtitle: clean(values.subtitle),
      description: clean(values.description),
      imageUrl: values.imageUrl.trim(),
      overlayColor: clean(values.overlayColor),
      overlayOpacity: values.overlayOpacity,
      textColor: clean(values.textColor),
      textAlign: clean(values.textAlign),
      ctaText: clean(values.ctaText),
      ctaLink: clean(values.ctaLink),
      ctaStyle: clean(values.ctaStyle),
      secondaryCtaText: clean(values.secondaryCtaText),
      secondaryCtaLink: clean(values.secondaryCtaLink),
      badgeText: clean(values.badgeText),
      badgeColor: clean(values.badgeColor),
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };
    if (isEditing && banner)
      await update.mutateAsync({ id: banner.bannerId, dto: payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>
            {isEditing ? "Edit Banner" : "Add Banner"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-2.5 mt-2.5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Banner headline" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle</FormLabel>
                      <FormControl>
                        <Input placeholder="Secondary text" {...field} />
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
                        <Textarea
                          placeholder="Banner description"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner Image *</FormLabel>
                      <div className="space-y-2">
                        {(imagePreview || field.value) && (
                          <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden border bg-muted">
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
                          folder="banners"
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
                    name="badgeText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge Text</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. New" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="badgeColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              className="w-10 h-10 p-1 cursor-pointer"
                              value={field.value || "#3b82f6"}
                              onChange={field.onChange}
                            />
                            <Input
                              placeholder="#3b82f6"
                              {...field}
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-2.5 mt-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="textColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              className="w-10 h-10 p-1 cursor-pointer"
                              value={field.value || "#ffffff"}
                              onChange={field.onChange}
                            />
                            <Input {...field} className="flex-1" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="textAlign"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Alignment</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="overlayOpacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Overlay Opacity: {field.value}%
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overlayColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overlay Color</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="rgba(0,0,0,0.4)"
                          {...field}
                        />
                      </FormControl>
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
              </TabsContent>

              <TabsContent value="actions" className="space-y-2.5 mt-2.5">
                <p className="text-sm text-muted-foreground">
                  Primary Call-to-Action
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="ctaText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Text</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Explore Courses"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ctaLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Link</FormLabel>
                        <FormControl>
                          <Input placeholder="/courses" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="ctaStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Style</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                          <SelectItem value="outline">Outline</SelectItem>
                          <SelectItem value="ghost">Ghost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Secondary Call-to-Action (optional)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="secondaryCtaText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Text</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Learn More"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondaryCtaLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Link</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="/about-us"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
              >
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
