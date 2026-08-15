import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-pending",
];

const OPEN_ROUTES = ["/unauthorized"];

const roleBasedRoutes: Record<string, string[]> = {
  INSTRUCTOR: ["/instructor", "/admin/batches"],
  CORPORATE_ADMIN: ["/corporate"],
  PLATFORM_ADMIN: ["/admin", "/instructor"],
};

const LEARNER_APP_URL =
  process.env.NEXT_PUBLIC_LEARNER_URL?.replace(/\/$/, "") ||
  "http://localhost:6002";

function decodeJwtPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (payload === undefined) return null;
    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(paddedPayload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getDashboardRoute(role: string): string {
  const roleToRoute: Record<string, string> = {
    PLATFORM_ADMIN: "/admin/dashboard",
    INSTRUCTOR: "/instructor/dashboard",
    CORPORATE_ADMIN: "/corporate/dashboard",
  };
  return roleToRoute[role] || "/admin/dashboard";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("admin-auth-token")?.value;

  if (
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    OPEN_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (!token) {
    if (isAuthRoute) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirect",
      pathname + (request.nextUrl.search || ""),
    );
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : false;

  if (!role || isExpired) {
    if (isAuthRoute) {
      const response = NextResponse.next();
      if (isExpired) response.cookies.delete("admin-auth-token");
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirect",
      pathname + (request.nextUrl.search || ""),
    );
    const response = NextResponse.redirect(loginUrl);
    if (isExpired) response.cookies.delete("admin-auth-token");
    return response;
  }

  if (role === "LEARNER") {
    if (isAuthRoute) return NextResponse.next();
    return NextResponse.redirect(`${LEARNER_APP_URL}/my-courses`);
  }

  const dashboardRoute = getDashboardRoute(role);

  if (isAuthRoute) {
    if (pathname === dashboardRoute) return NextResponse.next();
    return NextResponse.redirect(new URL(dashboardRoute, request.url));
  }

  const allowed = roleBasedRoutes[role] ?? [];
  const hasAccess = allowed.some((r) => pathname.startsWith(r));
  if (!hasAccess) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
