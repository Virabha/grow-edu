"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
function EmailVerificationPendingContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "your email";
    return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 relative h-40 w-full flex items-center justify-center">
            <Image src="/illustrations/pending_approval.svg" alt="Check your email" fill className="object-contain"/>
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to <span className="font-semibold">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Click the verification link in your email to activate your account.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground flex items-start">
                <span className="mr-2">•</span>
                <span>Check your spam folder if you don&apos;t see the email</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-start">
                <span className="mr-2">•</span>
                <span>The verification link will expire in 24 hours</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-start">
                <span className="mr-2">•</span>
                <span>After verifying, you&apos;ll be able to log in</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4"/>
              Refresh Page
            </Button>
            
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already verified? </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                Go to Login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);
}
export default function VerifyEmailPendingPage() {
    return (<Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin"/>
            </div>
            <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>}>
      <EmailVerificationPendingContent />
    </Suspense>);
}
