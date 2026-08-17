"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import {
  Camera,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Shield,
  Trash2,
  Twitter,
  User,
} from "lucide-react";

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
import { SecureImage } from "@/components/ui/secure-image";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import {
  useChangeEmail,
  useChangePassword,
  useProfile,
  useUpdateProfile,
  type Profile,
} from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";

const personalSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "Too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Too long"),
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

type Section = "profile" | "account" | "location" | "security";

interface NavItem {
  key: Section;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "profile",
    label: "Profile",
    icon: <User className="size-4" aria-hidden={true} />,
    description: "Name, bio & photo",
  },
  {
    key: "account",
    label: "Account",
    icon: <Mail className="size-4" aria-hidden={true} />,
    description: "Email & password",
  },
  {
    key: "location",
    label: "Location & Links",
    icon: <MapPin className="size-4" aria-hidden={true} />,
    description: "Address & social",
  },
  {
    key: "security",
    label: "Devices",
    icon: <Shield className="size-4" aria-hidden={true} />,
    description: "Active sessions",
  },
];

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const [section, setSection] = useState<Section>("profile");

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <div className="space-y-5">
        <ProfileHero profile={profile} />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <ProfileNav active={section} onChange={setSection} />

          <div className="min-w-0 flex-1">
            {section === "profile" && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
                <PersonalSection />
              </div>
            )}
            {section === "account" && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-150 space-y-4">
                <EmailSection email={profile?.email ?? ""} />
                <PasswordSection />
              </div>
            )}
            {section === "location" && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-150 grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
                <LocationSection />
                <SocialSection />
              </div>
            )}
            {section === "security" && (
              <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
                <SecuritySection />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileHero({ profile }: { profile: Profile | undefined }) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImage = preview ?? profile?.profileImage ?? null;
  const uploading = uploadAvatar.isPending;
  const firstName = profile?.firstName ?? "";
  const lastName = profile?.lastName ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Your Profile";

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
      toast.error(getApiError(err, "Could not upload that image").message);
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
    } catch (err) {
      toast.error(getApiError(err, "Could not remove the photo").message);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_12px_-4px_rgba(28,25,23,0.08)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at top left, oklch(0.72 0.13 75 / 0.11), transparent 60%), radial-gradient(ellipse 80% 60% at bottom right, oklch(0.58 0.13 72 / 0.06), transparent 70%)",
        }}
        aria-hidden={true}
      />

      <div className="relative flex flex-col items-center gap-5 px-6 py-7 sm:flex-row sm:gap-6 sm:px-8 sm:py-8">
        <div className="relative shrink-0">
          <div
            className="size-24 rounded-full p-[3px] sm:size-28"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.14 75), oklch(0.58 0.13 72) 50%, oklch(0.7 0.13 75))",
            }}
          >
            <div className="flex size-full items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted">
              {displayImage ? (
                <SecureImage
                  src={displayImage}
                  alt={fullName}
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-10 text-muted-foreground/50" aria-hidden={true} />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
            className="absolute bottom-0.5 right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="font-display text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
            {fullName}
          </h1>

          {profile?.headline && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.headline}</p>
          )}

          {profile?.email && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
              <Mail className="size-3 shrink-0" aria-hidden={true} />
              {profile.email}
            </span>
          )}

          {displayImage && (
            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleRemoveImage}
                disabled={uploading || updateProfile.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" />
                Remove photo
              </Button>
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <p className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
            Your account
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileNav({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <>
      <div className="-mx-4 overflow-x-auto scrollbar-none pb-1 sm:-mx-6 lg:hidden">
        <div
          role="tablist"
          aria-label="Profile settings sections"
          className="flex gap-2 px-4 sm:px-6"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active === item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <nav
        aria-label="Profile settings sections"
        className="hidden w-52 shrink-0 lg:block"
      >
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onChange(item.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-accent",
                    )}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-primary" : "text-foreground",
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground/80">
                      {item.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  accent = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: "primary" | "destructive" | "amber";
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          accentClasses[accent],
        )}
      >
        {icon}
      </div>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-0.5">{description}</CardDescription>
      </div>
    </div>
  );
}

function PersonalSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
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
      onError: (err) => {
        const apiError = getApiError(err, "Could not save your profile");
        toast.error(apiError.message);
        for (const [field, message] of Object.entries(apiError.fieldErrors)) {
          setError(field as FieldPath<PersonalValues>, { message });
        }
      },
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeader
          icon={<User className="size-4" aria-hidden={true} />}
          title="Personal information"
          description="This is what other learners and instructors see."
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="First name" error={errors.firstName?.message}>
              <Input
                {...register("firstName")}
                placeholder="First name"
                autoComplete="given-name"
              />
            </FormField>
            <FormField label="Last name" error={errors.lastName?.message}>
              <Input
                {...register("lastName")}
                placeholder="Last name"
                autoComplete="family-name"
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Headline" error={errors.headline?.message}>
              <Input
                {...register("headline")}
                placeholder="Preparing for UPSC CSE 2027"
              />
            </FormField>
            <FormField label="Phone" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                placeholder="+91 98765 43210"
                type="tel"
                autoComplete="tel"
              />
            </FormField>
          </div>

          <FormField label="About you" error={errors.bio?.message}>
            <Textarea
              {...register("bio")}
              rows={4}
              placeholder="A few lines about what you are studying and why."
            />
          </FormField>

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            {isDirty ? (
              <p className="text-[11px] text-muted-foreground">Unsaved changes</p>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              disabled={updateProfile.isPending || !isDirty}
              className="w-full sm:w-auto"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailSection({ email }: { email: string }) {
  const changeEmail = useChangeEmail();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    reset({ email });
  }, [email, reset]);

  function onSubmit(values: EmailValues) {
    changeEmail.mutate(values, {
      onSuccess: () => {
        toast.success("Email updated. Verify it from the link we just sent.");
        reset(values);
      },
      onError: (err) => {
        const apiError = getApiError(err, "Could not change your email");
        toast.error(apiError.message);
        for (const [field, message] of Object.entries(apiError.fieldErrors)) {
          setError(field as FieldPath<EmailValues>, { message });
        }
      },
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeader
          icon={<Mail className="size-4" aria-hidden={true} />}
          title="Email address"
          description="You sign in with this address and we send receipts to it."
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
            {changeEmail.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Change email"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    setError,
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
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success("Password updated");
          reset();
        },
        onError: (err) => {
          const apiError = getApiError(err, "Could not change your password");
          toast.error(apiError.message);
          for (const [field, message] of Object.entries(apiError.fieldErrors)) {
            setError(field as FieldPath<PasswordValues>, { message });
          }
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeader
          icon={<Lock className="size-4" aria-hidden={true} />}
          title="Password"
          description="Use at least 8 characters. Changing it signs out your other devices."
          accent="destructive"
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField label="Current password" error={errors.currentPassword?.message}>
            <Input
              {...register("currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="New password" error={errors.newPassword?.message}>
              <Input
                {...register("newPassword")}
                type="password"
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Repeat new password" error={errors.confirmPassword?.message}>
              <Input
                {...register("confirmPassword")}
                type="password"
                autoComplete="new-password"
              />
            </FormField>
          </div>
          <Button
            type="submit"
            variant="destructive"
            disabled={changePassword.isPending}
            className="w-full sm:w-auto"
          >
            {changePassword.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Change password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LocationSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
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
      onError: (err) => {
        const apiError = getApiError(err, "Could not save your address");
        toast.error(apiError.message);
        for (const [field, message] of Object.entries(apiError.fieldErrors)) {
          setError(field as FieldPath<LocationValues>, { message });
        }
      },
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeader
          icon={<MapPin className="size-4" aria-hidden={true} />}
          title="Billing address"
          description="Used on the invoices for your orders."
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField label="Address" error={errors.addressLine?.message}>
            <Input
              {...register("addressLine")}
              placeholder="Flat, street"
              autoComplete="street-address"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="City" error={errors.city?.message}>
              <Input
                {...register("city")}
                placeholder="Pune"
                autoComplete="address-level2"
              />
            </FormField>
            <FormField label="State" error={errors.state?.message}>
              <Input
                {...register("state")}
                placeholder="Maharashtra"
                autoComplete="address-level1"
              />
            </FormField>
            <FormField label="Country" error={errors.country?.message}>
              <Input
                {...register("country")}
                placeholder="India"
                autoComplete="country-name"
              />
            </FormField>
            <FormField label="PIN code" error={errors.postalCode?.message}>
              <Input
                {...register("postalCode")}
                placeholder="411038"
                autoComplete="postal-code"
              />
            </FormField>
          </div>
          <Button
            type="submit"
            disabled={updateProfile.isPending || !isDirty}
            className="w-full sm:w-auto"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save address"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const SOCIAL_FIELDS = [
  {
    key: "website" as const,
    label: "Website",
    Icon: Globe,
    placeholder: "https://yoursite.com",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    Icon: Linkedin,
    placeholder: "https://linkedin.com/in/…",
  },
  {
    key: "twitter" as const,
    label: "X / Twitter",
    Icon: Twitter,
    placeholder: "https://x.com/…",
  },
  {
    key: "github" as const,
    label: "GitHub",
    Icon: Github,
    placeholder: "https://github.com/…",
  },
];

function SocialSection() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
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
        onError: (err) => {
          const apiError = getApiError(err, "Could not save your links");
          toast.error(apiError.message);
          for (const [field, message] of Object.entries(apiError.fieldErrors)) {
            setError(field as FieldPath<SocialValues>, { message });
          }
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeader
          icon={<Globe className="size-4" aria-hidden={true} />}
          title="Social links"
          description="Shown on your public profile. Leave any of them blank."
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((field) => (
              <FormField
                key={field.key}
                label={field.label}
                error={errors[field.key]?.message}
              >
                <div className="relative">
                  <field.Icon
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden={true}
                  />
                  <Input
                    {...register(field.key)}
                    placeholder={field.placeholder}
                    inputMode="url"
                    className="pl-8"
                  />
                </div>
              </FormField>
            ))}
          </div>
          <Button
            type="submit"
            disabled={updateProfile.isPending || !isDirty}
            className="w-full sm:w-auto"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save links"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <SectionHeader
          icon={<Shield className="size-4" aria-hidden={true} />}
          title="Active sessions"
          description="Sign out any device you do not recognise. Signing out does not affect your enrolments."
          accent="amber"
        />
      </CardHeader>
      <CardContent>
        <DeviceList />
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card px-6 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <Skeleton className="size-24 shrink-0 rounded-full sm:size-28" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="mx-auto h-8 w-48 sm:mx-0" />
              <Skeleton className="mx-auto h-4 w-64 sm:mx-0" />
              <Skeleton className="mx-auto h-5 w-36 rounded-full sm:mx-0" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex gap-2 overflow-hidden lg:w-52 lg:flex-col lg:space-y-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 flex-1 rounded-full lg:h-12 lg:flex-none lg:rounded-lg" />
            ))}
          </div>
          <div className="flex-1">
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
