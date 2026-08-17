"use client";

import { useState } from "react";
import Image from "next/image";
import { Controller } from "react-hook-form";
import {
  Camera,
  Globe,
  Github,
  Linkedin,
  Loader2,
  Trash2,
  Twitter,
  User,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { useProfile, useUpdateMe } from "@/features/profile/hooks/use-profile";
import {
  useProfileForm,
  formDataToDto,
} from "@/features/profile/hooks/use-profile-form";

interface AvatarUploadResponse {
  url: string;
  key: string;
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <p className="font-display mt-1 text-xl font-medium text-foreground">
        {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function InstructorProfilePage() {
  const { data: profile, isLoading, error, refetch } = useProfile();
  const updateMe = useUpdateMe();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useProfileForm(profile);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const displayImage = imagePreview ?? profile?.profileImage ?? null;
  const isSaving = isSubmitting || updateMe.isPending;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profiles");
      const { data } = await apiClient.post<AvatarUploadResponse>(
        "/files/storage/upload-url",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      await updateMe.mutateAsync({ profileImage: data.key });
      setImagePreview(data.url);
      toast.success("Profile image updated.");
    } catch (err) {
      toast.error(getApiError(err, "Failed to upload image.").message);
    } finally {
      setUploading(false);
    }
  }

  async function handleImageRemove() {
    try {
      await updateMe.mutateAsync({ profileImage: null });
      setImagePreview(null);
      toast.success("Profile image removed.");
    } catch (err) {
      toast.error(getApiError(err, "Failed to remove image.").message);
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateMe.mutateAsync(formDataToDto(data));
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(getApiError(err, "Failed to save profile.").message);
    }
  });

  if (isLoading) {
    return (
      <PageLayout subtitle="Profile" header="Profile Settings">
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout subtitle="Profile" header="Profile Settings">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            {getApiError(error, "Failed to load profile.").message}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Profile"
      header="Profile Settings"
      description="Manage your public instructor profile and account information."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <section className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-3">
            <SectionHeader
              eyebrow="Profile"
              title="Photo"
              description="Click to change your avatar."
            />
            <div className="relative group">
              <div className="relative size-28 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : displayImage ? (
                  <Image
                    src={displayImage}
                    alt="Profile"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="size-10 text-muted-foreground" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="size-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {displayImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive text-xs h-7"
                onClick={handleImageRemove}
                disabled={uploading || updateMe.isPending}
              >
                <Trash2 className="size-3" />
                Remove
              </Button>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <SectionHeader
              eyebrow="Basics"
              title="Personal Information"
              description="Your name and professional headline as learners see them."
            />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email ?? ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First Name" error={errors.firstName?.message}>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="Jane"
                    disabled={isSaving}
                  />
                </FormField>
                <FormField label="Last Name" error={errors.lastName?.message}>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Doe"
                    disabled={isSaving}
                  />
                </FormField>
              </div>

              <FormField
                label="Headline"
                error={errors.headline?.message}
                description="A short professional tagline shown on your course pages."
              >
                <Input
                  id="headline"
                  {...register("headline")}
                  placeholder="Senior Software Engineer · 10+ years teaching"
                  disabled={isSaving}
                />
              </FormField>

              <FormField label="Bio" error={errors.bio?.message} description="Tell learners about your background (up to 2000 characters).">
                <Controller
                  control={control}
                  name="bio"
                  render={({ field }) => (
                    <Textarea
                      id="bio"
                      {...field}
                      value={field.value ?? ""}
                      rows={4}
                      placeholder="Share your experience, expertise, and what learners can expect from your courses."
                      disabled={isSaving}
                    />
                  )}
                />
              </FormField>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <SectionHeader
            eyebrow="Contact"
            title="Address & Phone"
            description="Optional contact information for your account."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+91 98765 43210"
                disabled={isSaving}
              />
            </FormField>

            <FormField
              label="Address"
              error={errors.addressLine?.message}
              className="sm:col-span-2 lg:col-span-1"
            >
              <Input
                id="addressLine"
                {...register("addressLine")}
                placeholder="123 Main St"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="City" error={errors.city?.message}>
              <Input
                id="city"
                {...register("city")}
                placeholder="Mumbai"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="State / Province" error={errors.state?.message}>
              <Input
                id="state"
                {...register("state")}
                placeholder="Maharashtra"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Country" error={errors.country?.message}>
              <Input
                id="country"
                {...register("country")}
                placeholder="India"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Postal Code" error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                {...register("postalCode")}
                placeholder="400001"
                disabled={isSaving}
              />
            </FormField>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <SectionHeader
            eyebrow="Online"
            title="Social Links"
            description="Add your public profiles so learners can follow your work."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Website"
              error={errors.socialWebsite?.message}
            >
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="socialWebsite"
                  {...register("socialWebsite")}
                  placeholder="https://yoursite.com"
                  className="pl-9"
                  autoComplete="off"
                  disabled={isSaving}
                />
              </div>
            </FormField>

            <FormField label="Twitter / X" error={errors.socialTwitter?.message}>
              <div className="relative">
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="socialTwitter"
                  {...register("socialTwitter")}
                  placeholder="https://twitter.com/handle"
                  className="pl-9"
                  autoComplete="off"
                  disabled={isSaving}
                />
              </div>
            </FormField>

            <FormField label="LinkedIn" error={errors.socialLinkedin?.message}>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="socialLinkedin"
                  {...register("socialLinkedin")}
                  placeholder="https://linkedin.com/in/handle"
                  className="pl-9"
                  autoComplete="off"
                  disabled={isSaving}
                />
              </div>
            </FormField>

            <FormField label="YouTube" error={errors.socialYoutube?.message}>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="socialYoutube"
                  {...register("socialYoutube")}
                  placeholder="https://youtube.com/@channel"
                  className="pl-9"
                  autoComplete="off"
                  disabled={isSaving}
                />
              </div>
            </FormField>

            <FormField label="GitHub" error={errors.socialGithub?.message}>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="socialGithub"
                  {...register("socialGithub")}
                  placeholder="https://github.com/handle"
                  className="pl-9"
                  autoComplete="off"
                  disabled={isSaving}
                />
              </div>
            </FormField>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!isDirty || isSaving}
            onClick={() => form.reset()}
          >
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || isSaving} className="gap-1.5">
            {isSaving && <Loader2 className="size-3.5 animate-spin" />}
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
