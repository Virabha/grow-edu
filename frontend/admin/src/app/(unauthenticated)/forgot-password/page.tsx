"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/features/auth/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export default function ForgotPasswordPage() {
    const forgotPassword = useForgotPassword();
    const { register, handleSubmit, formState: { errors, isSubmitSuccessful }, } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });
    useEffect(() => {
        if (forgotPassword.isError) {
            const errorMessage = forgotPassword.error instanceof Error
                ? forgotPassword.error.message
                : "Failed to send reset email. Please try again.";
            toast.error(errorMessage);
        }
    }, [forgotPassword.isError, forgotPassword.error]);
    const onSubmit = (data: ForgotPasswordFormData) => {
        forgotPassword.mutate(data);
    };
    if (isSubmitSuccessful && forgotPassword.isSuccess) {
        return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400"/>
            </div>
            <CardTitle className="text-xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder or try again.</p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>);
    }
    return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {forgotPassword.isError && (<div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                <span>
                  {forgotPassword.error instanceof Error
                ? forgotPassword.error.message
                : "Failed to send reset email. Please try again."}
                </span>
              </div>)}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} disabled={forgotPassword.isPending}/>
              {errors.email && (<p className="text-xs text-destructive">{errors.email.message}</p>)}
            </div>
            <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
              {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
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
