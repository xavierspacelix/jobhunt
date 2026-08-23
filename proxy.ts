import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/jobs", "/tracker"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function protectedCallbackPath(url: URL): string {
  return `${url.pathname}${url.search}`;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = isProtectedPath(pathname);
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
  });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", protectedCallbackPath(req.nextUrl));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/jobs/:path*",
    "/tracker/:path*",
  ],
};
