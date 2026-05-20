"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { authApi } from "../api/auth.api";
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, } from "../types";
import { env } from "@/lib/env";

function getPostLoginDestination(role: string): string {
    // LEARNERs live in a different app (port 6002) — bounce them there.
    if (role === "LEARNER") {
        const base = env.NEXT_PUBLIC_LEARNER_URL.replace(/\/$/, "");
        return `${base}/my-courses`;
    }
    const roleToPath: Record<string, string> = {
        PLATFORM_ADMIN: "/admin/dashboard",
        INSTRUCTOR: "/instructor/dashboard",
        CORPORATE_ADMIN: "/corporate/dashboard",
    };
    return roleToPath[role] || "/admin/dashboard";
}
export function useLogin() {
    const { setUser, setToken } = useAuthStore();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: LoginDto) => authApi.login(dto),
        onSuccess: (data) => {
            setToken(data.access_token);
            setUser(data.user);
            if (typeof window !== "undefined") {
                localStorage.setItem("auth-token", data.access_token);
                const expires = new Date();
                expires.setDate(expires.getDate() + 7);
                document.cookie = `auth-token=${data.access_token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
            }
            queryClient.invalidateQueries();
            window.location.href = getPostLoginDestination(data.user.role);
        },
    });
}
export function useRegister() {
    const router = useRouter();
    return useMutation({
        mutationFn: (dto: RegisterDto) => authApi.register(dto),
        onSuccess: (data) => {
            router.push(`/verify-email-pending?email=${encodeURIComponent(data.email)}`);
        },
    });
}
export function useForgotPassword() {
    return useMutation({
        mutationFn: (dto: ForgotPasswordDto) => authApi.forgotPassword(dto),
    });
}
export function useResetPassword() {
    const router = useRouter();
    return useMutation({
        mutationFn: (dto: ResetPasswordDto) => authApi.resetPassword(dto),
        onSuccess: () => {
            router.push("/login");
        },
    });
}
export function useVerifyEmail() {
    return useMutation({
        mutationFn: (token: string) => authApi.verifyEmail(token),
    });
}
