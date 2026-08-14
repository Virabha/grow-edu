"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, User } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { DeviceList } from "@/components/profile/device-list";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api/client";
import {
  useChangeEmail,
  useChangePassword,
  useProfile,
  useUpdateProfile,
} from "@/lib/hooks/use-profile";

/* ------------------------------------------------------------- schemas */

const personalSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "Too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Too long"),
  headline: z.string().max(120, "Keep it under 120 characters").optional(),
  bio: z.string().max(600, "Keep it under 600 characters").optional(),
  phone: z.string().max(20, "Too long").optional(),
});

const locationSchema = z.object({
  addressLine: z.string().max(120, "Too long").optional(),
  city: z.string().max(60, "Too long").optional(),
  state: z.string().max(60, "Too long").optional(),
  country: z.string().max(60, "Too long").optional(),
  postalCode: z.string().max(12, "Too long").optional(),
});

const socialSchema = z.object({
  website: z.string().url("Enter a full URL").or(z.literal("")),
  linkedin: z.string().url("Enter a full URL").or(z.literal("")),
  twitter: z.string().url("Enter a full URL").or(z.literal("")),
  github: z.string().url("Enter a full URL").or(z.literal("")),
});

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Repeat the new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PersonalValues = z.infer<typeof personalSchema>;
type LocationValues = z.infer<typeof locationSchema>;
type SocialValues = z.infer<typeof socialSchema>;
type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

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

/* ---------------------------------------------------------------- page */

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <PageLayout header="Profile settings">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72 rounded-md" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Your account"
      header="Profile settings"
      description="Your details, how you sign in, and where you are signed in."
    >
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="security">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-3">
          <div className="grid gap-4 [&>*]:min-w-0 md:grid-cols-[220px_1fr]">
            <AvatarCard image={profile?.profileImage ?? null} />
            <PersonalCard />
          </div>
        </TabsContent>

        <TabsContent value="account" className="mt-3">
          <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
            <EmailCard currentEmail={profile?.email ?? ""} />
            <PasswordCard />
          </div>
        </TabsContent>

        <TabsContent value="location" className="mt-3">
          <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
            <LocationCard />
            <SocialCard />
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Where you are signed in</CardTitle>
              <CardDescription>
                Sign out any device you do not recognise. Signing out does not
                affect your enrolments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

/* --------------------------------------------------------------- cards */

function AvatarCard({ image }: { image: string | null }) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = preview ?? image;
  const uploading = uploadAvatar.isPending;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const { key, url } = await uploadAvatar.mutateAsync(file);
      await updateProfile.mutateAsync({ profileImage: key });
      setPreview(url);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not upload that image",
      );
      setPreview(null);
    } finally {
      URL.revokeObjectURL(localUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveImage() {
    try {
      await updateProfile.mutateAsync({ profileImage: null });
      setPreview(null);
      toast.success("Profile photo removed");
    } catch {
      toast.error("Could not remove the photo");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Profile photo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImage}
              alt="Your profile photo"
              className="size-full object-cover"
            />
          ) : (
            <User className="size-12 text-muted-foreground/50" aria-hidden="true" />
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

        <p className="text-center text-[11px] text-muted-foreground">
          JPG or PNG, up to 8&nbsp;MB.
        </p>

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
  );
}

function PersonalCard() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      headline: "",
      bio: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
    });
  }, [profile, reset]);

  function onSubmit(values: PersonalValues) {
    updateProfile.mutate(values, {
      onSuccess: (updated) => {
        toast.success("Profile updated");
        reset({
          firstName: updated.firstName ?? "",
          lastName: updated.lastName ?? "",
          headline: updated.headline ?? "",
          bio: updated.bio ?? "",
          phone: updated.phone ?? "",
        });
      },
      onError: () => toast.error("Could not save your profile"),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Personal information</CardTitle>
        <CardDescription>
          This is what other learners and instructors see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="First name" error={errors.firstName?.message}>
              <Input {...register("firstName")} placeholder="First name" />
            </FormField>
            <FormField label="Last name" error={errors.lastName?.message}>
              <Input {...register("lastName")} placeholder="Last name" />
            </FormField>
          </div>

          <FormField label="Headline" error={errors.headline?.message}>
            <Input
              {...register("headline")}
              placeholder="Preparing for UPSC CSE 2027"
            />
          </FormField>

          <FormField label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="+91 98765 43210" />
          </FormField>

          <FormField label="About you" error={errors.bio?.message}>
            <Textarea
              {...register("bio")}
              rows={4}
              placeholder="A line or two about what you are studying and why."
            />
          </FormField>

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
  );
}

function LocationCard() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      addressLine: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      addressLine: profile.addressLine ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      country: profile.country ?? "",
      postalCode: profile.postalCode ?? "",
    });
  }, [profile, reset]);

  function onSubmit(values: LocationValues) {
    updateProfile.mutate(values, {
      onSuccess: () => {
        toast.success("Address updated");
        reset(values);
      },
      onError: () => toast.error("Could not save your address"),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Billing address</CardTitle>
        <CardDescription>Used on the invoices for your orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Address" error={errors.addressLine?.message}>
            <Input {...register("addressLine")} placeholder="Flat, street" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="City" error={errors.city?.message}>
              <Input {...register("city")} placeholder="Pune" />
            </FormField>
            <FormField label="State" error={errors.state?.message}>
              <Input {...register("state")} placeholder="Maharashtra" />
            </FormField>
            <FormField label="Country" error={errors.country?.message}>
              <Input {...register("country")} placeholder="India" />
            </FormField>
            <FormField label="PIN code" error={errors.postalCode?.message}>
              <Input {...register("postalCode")} placeholder="411038" />
            </FormField>
          </div>
          <Button
            type="submit"
            disabled={updateProfile.isPending || !isDirty}
            className="w-full sm:w-auto"
          >
            {updateProfile.isPending ? "Saving…" : "Save address"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SocialCard() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SocialValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: { website: "", linkedin: "", twitter: "", github: "" },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      website: profile.social?.website ?? "",
      linkedin: profile.social?.linkedin ?? "",
      twitter: profile.social?.twitter ?? "",
      github: profile.social?.github ?? "",
    });
  }, [profile, reset]);

  function onSubmit(values: SocialValues) {
    updateProfile.mutate(
      { social: values },
      {
        onSuccess: () => {
          toast.success("Links updated");
          reset(values);
        },
        onError: () => toast.error("Could not save your links"),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Social links</CardTitle>
        <CardDescription>
          Shown on your public profile. Leave any of them blank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Website" error={errors.website?.message}>
            <Input {...register("website")} placeholder="https://" inputMode="url" />
          </FormField>
          <FormField label="LinkedIn" error={errors.linkedin?.message}>
            <Input
              {...register("linkedin")}
              placeholder="https://www.linkedin.com/in/…"
              inputMode="url"
            />
          </FormField>
          <FormField label="X / Twitter" error={errors.twitter?.message}>
            <Input {...register("twitter")} placeholder="https://x.com/…" inputMode="url" />
          </FormField>
          <FormField label="GitHub" error={errors.github?.message}>
            <Input
              {...register("github")}
              placeholder="https://github.com/…"
              inputMode="url"
            />
          </FormField>
          <Button
            type="submit"
            disabled={updateProfile.isPending || !isDirty}
            className="w-full sm:w-auto"
          >
            {updateProfile.isPending ? "Saving…" : "Save links"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailCard({ currentEmail }: { currentEmail: string }) {
  const changeEmail = useChangeEmail();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    reset({ email: currentEmail });
  }, [currentEmail, reset]);

  function onSubmit(values: EmailValues) {
    changeEmail.mutate(values, {
      onSuccess: () => {
        toast.success("Email updated. Verify it from the link we just sent.");
        reset(values);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not change your email",
        ),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Email address</CardTitle>
        <CardDescription>
          You sign in with this address, and we send receipts to it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </FormField>
          <Button
            type="submit"
            disabled={changeEmail.isPending || !isDirty}
            className="w-full sm:w-auto"
          >
            {changeEmail.isPending ? "Saving…" : "Change email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: PasswordValues) {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          toast.success("Password updated");
          reset();
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not change your password",
          ),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Use at least 8 characters. Changing it signs out your other devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Current password"
            error={errors.currentPassword?.message}
          >
            <Input
              {...register("currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          </FormField>
          <FormField label="New password" error={errors.newPassword?.message}>
            <Input
              {...register("newPassword")}
              type="password"
              autoComplete="new-password"
            />
          </FormField>
          <FormField
            label="Repeat new password"
            error={errors.confirmPassword?.message}
          >
            <Input
              {...register("confirmPassword")}
              type="password"
              autoComplete="new-password"
            />
          </FormField>
          <Button
            type="submit"
            disabled={changePassword.isPending}
            className="w-full sm:w-auto"
          >
            {changePassword.isPending ? "Saving…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
