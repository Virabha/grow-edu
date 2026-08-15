"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { authApi } from "../api/auth.api";
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, } from "../types";
import { env } from "@/lib/env";

function getPostLoginDestination(role: string): string {
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

function getSafeRedirect(search: string, fallback: string): string {
    const params = new URLSearchParams(search);
    const redirect = params.get("redirect");
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
        return redirect;
    }
    return fallback;
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
                localStorage.setItem("admin-auth-token", data.access_token);
                const expires = new Date();
                expires.setDate(expires.getDate() + 7);
                document.cookie = `admin-auth-token=${data.access_token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
            }
            queryClient.invalidateQueries();
            const defaultDest = getPostLoginDestination(data.user.role);
            const dest =
                data.user.role !== "LEARNER" && typeof window !== "undefined"
                    ? getSafeRedirect(window.location.search, defaultDest)
                    : defaultDest;
            window.location.href = dest;
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
