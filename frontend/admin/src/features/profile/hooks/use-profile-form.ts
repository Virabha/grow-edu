"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MeProfile, UpdateMeDto } from "./use-profile";

const profileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(30).optional(),
  addressLine: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  socialWebsite: z
    .string()
    .max(255)
    .refine((v) => !v || /^https?:\/\//.test(v), {
      message: "Must be a valid URL starting with http:// or https://",
    })
    .optional(),
  socialTwitter: z.string().max(255).optional(),
  socialLinkedin: z.string().max(255).optional(),
  socialYoutube: z.string().max(255).optional(),
  socialGithub: z.string().max(255).optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

const EMPTY: ProfileFormData = {
  firstName: "",
  lastName: "",
  headline: "",
  bio: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  socialWebsite: "",
  socialTwitter: "",
  socialLinkedin: "",
  socialYoutube: "",
  socialGithub: "",
};

export function useProfileForm(profile: MeProfile | undefined) {
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
      addressLine: profile.addressLine ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      country: profile.country ?? "",
      postalCode: profile.postalCode ?? "",
      socialWebsite: profile.social?.website ?? "",
      socialTwitter: profile.social?.twitter ?? "",
      socialLinkedin: profile.social?.linkedin ?? "",
      socialYoutube: profile.social?.youtube ?? "",
      socialGithub: profile.social?.github ?? "",
    });
  }, [profile, form]);

  return form;
}

export function formDataToDto(data: ProfileFormData): UpdateMeDto {
  const social: Record<string, string> = {};
  if (data.socialWebsite) social.website = data.socialWebsite;
  if (data.socialTwitter) social.twitter = data.socialTwitter;
  if (data.socialLinkedin) social.linkedin = data.socialLinkedin;
  if (data.socialYoutube) social.youtube = data.socialYoutube;
  if (data.socialGithub) social.github = data.socialGithub;

  return {
    firstName: data.firstName || undefined,
    lastName: data.lastName || undefined,
    headline: data.headline || undefined,
    bio: data.bio || undefined,
    phone: data.phone || undefined,
    addressLine: data.addressLine || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    country: data.country || undefined,
    postalCode: data.postalCode || undefined,
    social,
  };
}
