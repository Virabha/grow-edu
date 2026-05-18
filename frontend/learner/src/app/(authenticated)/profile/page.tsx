"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "Too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Too long"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuthStore();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profiles");

      const { data } = await apiClient.post<{ url: string; key: string }>(
        "/files/storage/upload-url",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      // Save the key to the profile
      await updateProfile.mutateAsync({ profileImage: data.key });
      setImagePreview(data.url);
      toast.success("Profile image updated");
    } catch {
      toast.error("Failed to upload image");
      setImagePreview(null);
    } finally {
      setUploading(false);
      // Reset input so re-selecting the same file triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      onSuccess: () => toast.success("Profile updated successfully"),
      onError: () => toast.error("Failed to update profile"),
    });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <PageLayout header="Profile Settings">
          <Skeleton className="h-64 w-full" />
        </PageLayout>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <PageLayout
        header="Profile Settings"
        description="Manage your account information and preferences."
      >
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          {/* Left column - Profile Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt="Profile"
                      className="size-full object-cover"
                    />
                  ) : (
                    <User className="size-12 text-muted-foreground/50" />
                  )}

                  {/* Upload overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
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

          {/* Right column - Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email ?? ""}
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
                    />
                  </FormField>
                </div>
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !isDirty}
                  className="w-full sm:w-auto"
                >
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
  );
}
