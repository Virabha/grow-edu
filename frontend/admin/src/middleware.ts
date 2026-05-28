import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const roleBasedRoutes: Record<string, string[]> = {
  INSTRUCTOR: ["/instructor", "/admin/batches"],
  CORPORATE_ADMIN: ["/corporate"],
  PLATFORM_ADMIN: ["/admin", "/instructor"],
};

const LEARNER_APP_URL =
  process.env.NEXT_PUBLIC_LEARNER_URL?.replace(/\/$/, "") ||
  "http://localhost:6002";

function decodeJwtPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
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
  const token = request.cookies.get("auth-token")?.value;

  // Static / API / internal — never gate.
  if (
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r));

  if (!token) {
    if (isPublicRoute) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  if (!role) {
    if (isPublicRoute) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Learners do not belong in the admin app at all — send to the learner app.
  if (role === "LEARNER") {
    if (isPublicRoute) return NextResponse.next();
    return NextResponse.redirect(`${LEARNER_APP_URL}/my-courses`);
  }

  const dashboardRoute = getDashboardRoute(role);

  // Authenticated user hitting a public auth page → push to their dashboard.
  if (isPublicRoute) {
    if (pathname === dashboardRoute) return NextResponse.next();
    return NextResponse.redirect(new URL(dashboardRoute, request.url));
  }

  // Role guard against admin/instructor/corporate sections.
  const allowed = roleBasedRoutes[role] ?? [];
  const hasAccess = allowed.some((r) => pathname.startsWith(r));
  if (!hasAccess) {
    return NextResponse.redirect(new URL(dashboardRoute, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
