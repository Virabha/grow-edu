import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/profile",
  "/my-courses",
  "/cart",
  "/checkout",
  "/payment",
];

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  const payload = token ? decodeJwtPayload(token) : null;
  const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : false;
  const hasValidToken = !!token && !!payload && !isExpired;

  const isWatchRoute = /^\/courses\/[^/]+\/watch/.test(pathname);
  const isProtected = isWatchRoute || PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtected && !hasValidToken) {
    const response = NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url),
    );
    if (token) {
      response.cookies.delete("auth-token");
    }
    return response;
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/my-courses/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/payment/:path*",
    "/courses/:path*/watch",
  ],
};
