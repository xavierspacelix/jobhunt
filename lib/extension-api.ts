import { NextResponse } from "next/server";

import {
  extensionCorsHeaders,
  getExtensionIdFromOrigin,
  hashExtensionSecret,
  isValidExtensionOrigin,
  parseExtensionBearerToken,
} from "@/lib/extension-auth";
import { prisma } from "@/lib/db";

const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export function extensionApiResponse(
  origin: string,
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: extensionCorsHeaders(origin),
  });
}

export function extensionOptionsResponse(request: Request): Response {
  const origin = request.headers.get("origin");
  // Block foreign web origins, but allow extension origins and the "null"
  // origin some browsers send for extension-popup cross-origin fetches.
  if (origin && origin !== "null" && !isValidExtensionOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: extensionCorsHeaders(origin || "*"),
  });
}

export function getExtensionRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return isValidExtensionOrigin(origin) ? origin : null;
}

export function getClientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<
  | { ok: true; text: string }
  | { ok: false; reason: "invalid" | "too_large" }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      return { ok: false, reason: "invalid" };
    }
    if (bytes > maxBytes) return { ok: false, reason: "too_large" };
  }
  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(body),
    };
  } catch {
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export async function authenticateExtensionRequest(
  request: Request,
  requiredScope: "EXTENSION_JOBS_WRITE" | "EXTENSION_ACCOUNT_READ" =
    "EXTENSION_JOBS_WRITE",
) {
  const token = parseExtensionBearerToken(request.headers.get("authorization"));
  if (!token) return null;

  const tokenHash = hashExtensionSecret(token);
  const connection = await prisma.extensionConnection.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      extensionId: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (
    !connection ||
    connection.revokedAt ||
    connection.expiresAt <= new Date() ||
    !connection.scopes.includes(requiredScope)
  ) {
    return null;
  }

  // When the browser sends a valid extension Origin, ensure it matches the
  // token's extension id (defense in depth against cross-extension token use).
  // Some extension-popup cross-origin fetches omit/strip the Origin header, in
  // which case the secret Bearer token alone proves the request is the extension.
  const providedOrigin = request.headers.get("origin");
  if (providedOrigin) {
    const originId = getExtensionIdFromOrigin(providedOrigin);
    if (!originId || originId !== connection.extensionId) return null;
  }

  return connection;
}

export async function markExtensionSave(connectionId: string): Promise<void> {
  const staleBefore = new Date(Date.now() - LAST_USED_WRITE_INTERVAL_MS);
  await prisma.extensionConnection.updateMany({
    where: {
      id: connectionId,
      revokedAt: null,
      OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: staleBefore } }],
    },
    data: { lastUsedAt: new Date() },
  });
}
