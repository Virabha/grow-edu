"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
export default function UnauthorizedPage() {
    const { user } = useAuthStore();
    return (<div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive"/>
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            {user ? (<p>
                Your current role: <span className="font-semibold">{user.role}</span>
              </p>) : (<p>Please log in to access this page.</p>)}
          </div>
          <div className="flex flex-col gap-2">
            {user ? (<>
                <Link href={user?.role === 'PLATFORM_ADMIN' ? "/admin/dashboard" :
                user?.role === 'INSTRUCTOR' ? "/instructor/dashboard" :
                    user?.role === 'CORPORATE_ADMIN' ? "/corporate/dashboard" :
                        "/learner/dashboard"}>
                  <Button className="w-full">
                    <Home className="h-4 w-4 mr-2"/>
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    Back to Home
                  </Button>
                </Link>
              </>) : (<Link href="/login">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>)}
          </div>
        </CardContent>
      </Card>
    </div>);
}
