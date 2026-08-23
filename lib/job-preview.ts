import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import {
  trustedJobPayloadSchema,
  type TrustedJobPayload,
} from "@/lib/job-data";

const PREVIEW_TTL_MS = 15 * 60 * 1000;

const matchPreviewSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    matchedSkills: z.array(z.string().trim().min(1).max(200)).max(50),
    missingSkills: z.array(z.string().trim().min(1).max(200)).max(50),
    source: z.literal("ai"),
    profileRevision: z.string().datetime(),
  })
  .strict();

const previewClaimsSchema = z
  .object({
    version: z.literal(1),
    userId: z.string().min(1).max(200),
    expiresAt: z.number().int().positive(),
    job: trustedJobPayloadSchema,
    match: matchPreviewSchema.optional(),
  })
  .strict();

interface PreviewOptions {
  secret?: string;
  now?: number;
  ttlMs?: number;
  match?: z.infer<typeof matchPreviewSchema>;
}

export type RecommendationPreview = {
  job: TrustedJobPayload;
  match: z.infer<typeof matchPreviewSchema>;
};

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
    match: options.match,
  });
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, resolveSecret(options.secret)).toString("base64url")}`;
}

export function verifyRecommendationPreview(
  token: string,
  userId: string,
  options: PreviewOptions = {},
): RecommendationPreview | null {
  const claims = verifyPreviewClaims(token, userId, options);
  return claims?.match ? { job: claims.job, match: claims.match } : null;
}

export function recommendationPreviewMatchesProfile(
  preview: RecommendationPreview,
  profileUpdatedAt: Date,
): boolean {
  return preview.match.profileRevision === profileUpdatedAt.toISOString();
}

function verifyPreviewClaims(
  token: string,
  userId: string,
  options: PreviewOptions,
): z.infer<typeof previewClaimsSchema> | null {
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
    supplied.length === expected.length
      ? supplied
      : Buffer.alloc(expected.length);
  const validSignature = timingSafeEqual(expected, comparable);
  if (!validSignature || supplied.length !== expected.length) return null;

  try {
    const claims = previewClaimsSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (
      claims.userId !== userId ||
      claims.expiresAt <= (options.now ?? Date.now())
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function verifyJobPreview(
  token: string,
  userId: string,
  options: PreviewOptions = {},
): TrustedJobPayload | null {
  return verifyPreviewClaims(token, userId, options)?.job ?? null;
}
