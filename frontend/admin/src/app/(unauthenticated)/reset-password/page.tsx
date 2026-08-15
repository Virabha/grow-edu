"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/features/auth/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiError } from "@/lib/api/errors";
import type { FieldPath } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
const resetPasswordSchema = z
    .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const resetPassword = useResetPassword();
    const { register, handleSubmit, setError, formState: { errors, isSubmitSuccessful }, } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });
    useEffect(() => {
        if (resetPassword.isError) {
            const apiError = getApiError(resetPassword.error, "Failed to reset password. Please try again.");
            for (const [field, message] of Object.entries(apiError.fieldErrors)) {
                setError(field as FieldPath<ResetPasswordFormData>, { type: "server", message });
            }
            if (Object.keys(apiError.fieldErrors).length === 0) {
                toast.error(apiError.message);
            }
        }
    }, [resetPassword.isError, resetPassword.error, setError]);
    const onSubmit = (data: ResetPasswordFormData) => {
        if (!token) {
            return;
        }
        resetPassword.mutate({
            token,
            newPassword: data.newPassword,
        });
    };
    if (!token) {
        return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>);
    }
    if (isSubmitSuccessful && resetPassword.isSuccess) {
        return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400"/>
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
            <CardDescription>
              Your password has been reset. You can now login with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>);
    }
    return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {resetPassword.isError && (<div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                <span>
                  {resetPassword.error instanceof Error
                ? resetPassword.error.message
                : "Failed to reset password. The link may have expired."}
                </span>
              </div>)}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" placeholder="••••••••" {...register("newPassword")} disabled={resetPassword.isPending}/>
              {errors.newPassword && (<p className="text-xs text-destructive">{errors.newPassword.message}</p>)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} disabled={resetPassword.isPending}/>
              {errors.confirmPassword && (<p className="text-xs text-destructive">{errors.confirmPassword.message}</p>)}
            </div>
            <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>);
}
export default function ResetPasswordPage() {
    return (<Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>}>
      <ResetPasswordForm />
    </Suspense>);
}
