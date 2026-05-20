"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "Too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Too long"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface AvatarUploadResponse {
  url: string;
  key: string;
}

function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profiles");
      const { data } = await apiClient.post<AvatarUploadResponse>(
        "/files/storage/upload-url",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
  });
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
      });
    }
  }, [profile, reset]);

  const displayImage = imagePreview ?? profile?.profileImage ?? null;
  const uploading = uploadAvatar.isPending;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    try {
      const { key, url } = await uploadAvatar.mutateAsync(file);
      await updateProfile.mutateAsync({ profileImage: key });
      setImagePreview(url);
      toast.success("Profile image updated");
    } catch {
      toast.error("Failed to upload image");
      setImagePreview(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveImage() {
    try {
      await updateProfile.mutateAsync({ profileImage: null });
      setImagePreview(null);
      toast.success("Profile image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  }

  function onSubmit(values: ProfileFormValues) {
    updateProfile.mutate(values, {
      onSuccess: () => toast.success("Profile updated"),
      onError: () => toast.error("Failed to update profile"),
    });
  }

  if (isLoading) {
    return (
      <PageLayout header="Profile settings">
        <Skeleton className="h-64 w-full" />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header="Profile settings"
      description="Manage your account information and preferences."
    >
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Profile photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                {displayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImage}
                    alt="Profile"
                    className="size-full object-cover"
                  />
                ) : (
                  <User className="size-12 text-muted-foreground/50" />
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Upload profile photo"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                >
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin text-white" />
                  ) : (
                    <Camera className="size-6 text-white" />
                  )}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {displayImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                disabled={uploading || updateProfile.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 size-3.5" />
                Remove
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email ?? ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email cannot be changed.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  label="First name"
                  error={errors.firstName?.message}
                >
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="First name"
                  />
                </FormField>
                <FormField label="Last name" error={errors.lastName?.message}>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Last name"
                  />
                </FormField>
              </div>
              <Button
                type="submit"
                disabled={updateProfile.isPending || !isDirty}
                className="w-full sm:w-auto"
              >
                {updateProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
