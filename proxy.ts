import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/jobs",
  "/tracker",
  "/extension/connect",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function protectedCallbackPath(url: URL): string {
  return `${url.pathname}${url.search}`;
}

export function extensionConnectCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
  ].join("; ");
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

  if (pathname === "/extension/connect") {
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const csp = extensionConnectCsp(nonce);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/jobs/:path*",
    "/tracker/:path*",
    "/extension/connect",
  ],
};
