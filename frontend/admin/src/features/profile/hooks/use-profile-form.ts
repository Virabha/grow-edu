"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useUpdateProfile } from "./use-profile";
import { useAuthStore } from "@/lib/store/auth-store";
import type { User } from "@/lib/api/services/users";
const profileSchema = z.object({
    firstName: z.string().min(0).optional(),
    lastName: z.string().min(0).optional(),
});
type ProfileFormData = z.infer<typeof profileSchema>;
export function useProfileForm(profile: User | undefined) {
    const { user } = useAuthStore();
    const updateProfile = useUpdateProfile();
    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
        },
    });
    useEffect(() => {
        if (profile) {
            form.reset({
                firstName: profile.firstName ?? "",
                lastName: profile.lastName ?? "",
            });
        }
    }, [profile, form]);
    const onSubmit = (formData: ProfileFormData) => {
        if (!user?.id) {
            return;
        }
        const currentFirstName = profile?.firstName ?? "";
        const currentLastName = profile?.lastName ?? "";
        const updateData: {
            firstName?: string;
            lastName?: string;
        } = {};
        const newFirstName = formData.firstName?.trim() || undefined;
        if (newFirstName !== currentFirstName) {
            updateData.firstName = newFirstName;
        }
        const newLastName = formData.lastName?.trim() || undefined;
        if (newLastName !== currentLastName) {
            updateData.lastName = newLastName;
        }
        if (Object.keys(updateData).length === 0) {
            return;
        }
        updateProfile.mutate({
            userId: user.id,
            data: updateData,
        });
    };
    return {
        ...form,
        onSubmit: form.handleSubmit(onSubmit),
        isPending: updateProfile.isPending,
    };
}
