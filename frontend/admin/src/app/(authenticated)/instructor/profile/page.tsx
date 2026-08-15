"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProfile, useUpdateProfile } from "@/features/profile/hooks/use-profile";
import { useProfileForm } from "@/features/profile/hooks/use-profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";
import { getApiError } from "@/lib/api/errors";

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

export default function InstructorProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const { user } = useAuthStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const uploading = uploadAvatar.isPending;
  const {
    register,
    formState: { errors },
    onSubmit,
    isPending,
  } = useProfileForm(profile);

  const displayImage = imagePreview ?? profile?.profileImage ?? null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    try {
      const { url, key } = await uploadAvatar.mutateAsync(file);
      await updateProfile.mutateAsync({
        userId: user.id,
        data: { profileImage: key },
      });
      setImagePreview(url);
      toast.success("Profile image updated");
    } catch (err) {
      toast.error(getApiError(err, "Failed to upload image").message);
    }
  }

  async function handleImageRemove() {
    if (!user?.id) return;
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        data: { profileImage: null },
      });
      setImagePreview(null);
      toast.success("Profile image removed");
    } catch (err) {
      toast.error(getApiError(err, "Failed to remove image").message);
    }
  }

  if (isLoading) {
    return (
      <PageLayout header="Loading...">
        <Skeleton className="h-64 w-full" />
      </PageLayout>
    );
  }

  return (
    <PageLayout header="Profile Settings">
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="size-28 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : displayImage ? (
                  <img
                    src={displayImage}
                    alt="Profile"
                    className="size-full object-cover"
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
            <p className="text-xs text-muted-foreground text-center">
              Click to upload
            </p>
            {displayImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive text-xs h-7"
                onClick={handleImageRemove}
                disabled={updateProfile.isPending}
              >
                <Trash2 className="size-3 mr-1" />
                Remove
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="First Name"
                  error={errors.firstName?.message}
                >
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="Enter your first name"
                    disabled={isPending}
                  />
                </FormField>
                <FormField
                  label="Last Name"
                  error={errors.lastName?.message}
                >
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Enter your last name"
                    disabled={isPending}
                  />
                </FormField>
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
