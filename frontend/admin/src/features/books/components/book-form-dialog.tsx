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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { SecureImage } from "@/components/ui/secure-image";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import { useCreateBook, useUpdateBook } from "../hooks/use-books";
import type { Book } from "../types";
import { getApiError } from "@/lib/api/errors";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  author: z.string().min(1, "Author is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  coverImage: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  compareAtPrice: z.coerce.number().min(0).optional(),
  currency: z.string().default("INR"),
  categoryId: z.string().optional(),
  isbn: z.string().optional(),
  pages: z.coerce.number().min(0).optional(),
  language: z.string().optional(),
  publisher: z.string().optional(),
  publishedYear: z.coerce.number().optional(),
  format: z.string().default("PHYSICAL"),
  status: z.string().default("DRAFT"),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().min(0).default(0),
});

type Values = z.infer<typeof schema>;

const defaults: Values = {
  title: "",
  slug: "",
  author: "",
  description: "",
  shortDescription: "",
  coverImage: "",
  price: 0,
  compareAtPrice: undefined,
  currency: "INR",
  categoryId: "",
  isbn: "",
  pages: undefined,
  language: "English",
  publisher: "",
  publishedYear: undefined,
  format: "PHYSICAL",
  status: "DRAFT",
  isActive: true,
  displayOrder: 0,
};

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function bookToValues(b: Book): Values {
  return {
    title: b.title,
    slug: b.slug,
    author: b.author,
    description: b.description ?? "",
    shortDescription: b.shortDescription ?? "",
    coverImage: b.coverImage ?? "",
    price: parseFloat(b.price),
    compareAtPrice: b.compareAtPrice ? parseFloat(b.compareAtPrice) : undefined,
    currency: b.currency,
    categoryId: b.categoryId ?? "",
    isbn: b.isbn ?? "",
    pages: b.pages ?? undefined,
    language: b.language ?? "English",
    publisher: b.publisher ?? "",
    publishedYear: b.publishedYear ?? undefined,
    format: b.format ?? "PHYSICAL",
    status: b.status,
    isActive: b.isActive,
    displayOrder: b.displayOrder,
  };
}

export function BookFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | null;
}) {
  const { open, onOpenChange, book } = props;
  const isEditing = !!book;
  const create = useCreateBook();
  const update = useUpdateBook();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (book) {
      form.reset(bookToValues(book));
      setImagePreview(book.coverImage || null);
    } else {
      form.reset(defaults);
      setImagePreview(null);
    }
  }, [book, form]);

  useEffect(() => {
    if (!open) {
      form.reset(defaults);
      setImagePreview(null);
    }
  }, [open, form]);

  const isPending = create.isPending || update.isPending;

  async function handleSubmitForm(values: Values) {
    try {
      const slug = values.slug.trim() || slugify(values.title);
      const payload = {
        title: values.title.trim(),
        slug,
        author: values.author.trim(),
        description: values.description?.trim() || undefined,
        shortDescription: values.shortDescription?.trim() || undefined,
        coverImage: values.coverImage?.trim() || undefined,
        price: values.price,
        compareAtPrice: values.compareAtPrice || undefined,
        currency: values.currency,
        categoryId: values.categoryId?.trim() || undefined,
        isbn: values.isbn?.trim() || undefined,
        pages: values.pages || undefined,
        language: values.language?.trim() || undefined,
        publisher: values.publisher?.trim() || undefined,
        publishedYear: values.publishedYear || undefined,
        format: values.format,
        status: values.status,
        isActive: values.isActive,
        displayOrder: values.displayOrder,
      };
      if (isEditing && book) {
        await update.mutateAsync({ id: book.bookId, dto: payload });
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
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Edit Book" : "Add Book"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-3">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Book title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl><Input {...field} placeholder="book-slug" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="author" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl><Input {...field} placeholder="Author name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="shortDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Description</FormLabel>
                  <FormControl><Input {...field} placeholder="Brief description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Description</FormLabel>
                  <FormControl><Textarea {...field} rows={4} placeholder="Detailed description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="coverImage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <div className="space-y-2">
                    {(imagePreview || field.value) && (
                      <div className="relative w-32 aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
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
                      folder="books"
                      label="Upload Cover"
                      className="w-full"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="compareAtPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compare Price</FormLabel>
                    <FormControl><Input type="number" min={0} step="0.01" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl><Input {...field} placeholder="INR" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="isbn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ISBN</FormLabel>
                    <FormControl><Input {...field} placeholder="ISBN" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pages" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pages</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="language" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl><Input {...field} placeholder="English" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="publisher" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publisher</FormLabel>
                    <FormControl><Input {...field} placeholder="Publisher" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="publishedYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value ?? ""} placeholder="2024" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="format" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PHYSICAL">Physical</SelectItem>
                        <SelectItem value="DIGITAL">Digital</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
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
