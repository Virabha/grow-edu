"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { authApi } from "../api/auth.api";
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, } from "../types";
function getDashboardRoute(role: string): string {
    const roleToPath = {
        LEARNER: "/learner/dashboard",
        PLATFORM_ADMIN: "/admin/dashboard",
        INSTRUCTOR: "/instructor/dashboard",
        CORPORATE_ADMIN: "/corporate/dashboard",
    };
    return roleToPath[role] || "/learner/dashboard";
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
            const dashboardRoute = getDashboardRoute(data.user.role);
            window.location.href = dashboardRoute;
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
