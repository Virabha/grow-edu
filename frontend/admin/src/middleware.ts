import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
];
const authRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
];
const roleBasedRoutes: Record<string, string[]> = {
    LEARNER: [
        "/learner/dashboard",
        "/learner/my-courses",
        "/learner/profile",
        "/learner/course",
        "/learner/checkout",
        "/learner/cart",
        "/learner/payment/success",
        "/learner/payment/failure",
    ],
    INSTRUCTOR: ["/instructor"],
    CORPORATE_ADMIN: ["/corporate"],
    PLATFORM_ADMIN: ["/admin", "/instructor"],
};
function decodeJwtPayload(token: string): {
    role?: string;
} | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3)
            return null;
        const payload = parts[1];
        const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);
        const decoded = Buffer.from(paddedPayload, "base64").toString("utf-8");
        return JSON.parse(decoded);
    }
    catch {
        return null;
    }
}
function getDashboardRoute(role: string): string {
    const roleToRoute: Record<string, string> = {
        LEARNER: "/learner/dashboard",
        PLATFORM_ADMIN: "/admin/dashboard",
        INSTRUCTOR: "/instructor/dashboard",
        CORPORATE_ADMIN: "/corporate/dashboard",
    };
    return roleToRoute[role] || "/learner/dashboard";
}
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("auth-token")?.value;
    if (pathname.startsWith("/learner/checkout")) {
        return NextResponse.redirect(new URL("/learner/cart", request.url));
    }
    if (pathname === "/" ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next"))
        return NextResponse.next();
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    const commonRoutes = [
        "/learner/profile",
        "/courses",
        "/search",
        "/categories",
        "/learner/cart",
        "/learner/courses",
    ];
    if (!token) {
        if (isPublicRoute)
            return NextResponse.next();
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }
    const payload = decodeJwtPayload(token);
    const userRole = payload?.role || "LEARNER";
    const dashboardRoute = getDashboardRoute(userRole);
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
    const isCommonRoute = commonRoutes.some((route) => pathname.startsWith(route));
    if (!payload?.role) {
        if (isAuthRoute)
            return NextResponse.next();
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }
    if (isAuthRoute) {
        if (pathname === dashboardRoute)
            return NextResponse.next();
        return NextResponse.redirect(new URL(dashboardRoute, request.url));
    }
    const hasAccess = roleBasedRoutes[userRole]?.some((route) => pathname.startsWith(route)) ??
        false;
    if (!hasAccess && !isCommonRoute) {
        if (pathname === dashboardRoute)
            return NextResponse.next();
        return NextResponse.redirect(new URL(dashboardRoute, request.url));
    }
    return NextResponse.next();
}
export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
    ],
};
