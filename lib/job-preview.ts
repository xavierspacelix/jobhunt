import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import {
  trustedJobPayloadSchema,
  type TrustedJobPayload,
} from "@/lib/job-data";

const PREVIEW_TTL_MS = 15 * 60 * 1000;

const previewClaimsSchema = z
  .object({
    version: z.literal(1),
    userId: z.string().min(1).max(200),
    expiresAt: z.number().int().positive(),
    job: trustedJobPayloadSchema,
  })
  .strict();

interface PreviewOptions {
  secret?: string;
  now?: number;
  ttlMs?: number;
}

function resolveSecret(secret?: string): string {
  const value = secret ?? process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required");
  return value;
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function signJobPreview(
  job: TrustedJobPayload,
  userId: string,
  options: PreviewOptions = {},
): string {
  const claims = previewClaimsSchema.parse({
    version: 1,
    userId,
    expiresAt: (options.now ?? Date.now()) + (options.ttlMs ?? PREVIEW_TTL_MS),
    job,
  });
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, resolveSecret(options.secret)).toString("base64url")}`;
}

export function verifyJobPreview(
  token: string,
  userId: string,
  options: PreviewOptions = {},
): TrustedJobPayload | null {
  const [payload, suppliedText, ...rest] = token.split(".");
  if (!payload || !suppliedText || rest.length > 0) return null;

  const expected = signature(payload, resolveSecret(options.secret));
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedText, "base64url");
  } catch {
    supplied = Buffer.alloc(expected.length);
  }
  const comparable =
    supplied.length === expected.length ? supplied : Buffer.alloc(expected.length);
  const validSignature = timingSafeEqual(expected, comparable);
  if (!validSignature || supplied.length !== expected.length) return null;

  try {
    const claims = previewClaimsSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (claims.userId !== userId || claims.expiresAt <= (options.now ?? Date.now())) {
      return null;
    }
    return claims.job;
  } catch {
    return null;
  }
}
