import { z } from "zod";

import {
  extensionApiResponse,
  extensionOptionsResponse,
  getClientAddress,
  getExtensionRequestOrigin,
} from "@/lib/extension-api";
import {
  EXTENSION_SCOPE,
  EXTENSION_TOKEN_TTL_MS,
  extensionOriginMatchesRedirectUri,
  generateExtensionSecret,
  getExtensionIdFromOrigin,
  hashExtensionSecret,
  isValidExtensionRedirectUri,
  isValidExtensionInstallationId,
  isValidPkceVerifier,
  verifyPkceS256,
} from "@/lib/extension-auth";
import { prisma } from "@/lib/db";
import { extensionTokenRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const tokenSchema = z
  .object({
    grantType: z.literal("authorization_code"),
    code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    codeVerifier: z.string().refine(isValidPkceVerifier),
    redirectUri: z.string().refine(isValidExtensionRedirectUri),
    installationId: z.string().refine(isValidExtensionInstallationId),
  })
  .strict();

class InvalidGrantError extends Error {}

export const OPTIONS = extensionOptionsResponse;

export async function POST(request: Request) {
  const origin = getExtensionRequestOrigin(request);
  if (!origin) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const clientAddress = getClientAddress(request);
  if (
    !extensionTokenRateLimit(`ip:${clientAddress}`)
  ) {
    return extensionApiResponse(origin, { error: "Rate limit exceeded" }, 429);
  }

  const parsed = tokenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return extensionApiResponse(origin, { error: "Invalid request" }, 400);
  }
  if (!extensionOriginMatchesRedirectUri(origin, parsed.data.redirectUri)) {
    return extensionApiResponse(origin, { error: "Invalid redirect origin" }, 400);
  }

  const codeHash = hashExtensionSecret(parsed.data.code);
  if (!extensionTokenRateLimit(`code:${codeHash}`)) {
    return extensionApiResponse(origin, { error: "Rate limit exceeded" }, 429);
  }

  const accessToken = generateExtensionSecret();
  const tokenHash = hashExtensionSecret(accessToken);
  const extensionId = getExtensionIdFromOrigin(origin);
  if (!extensionId) {
    return extensionApiResponse(origin, { error: "Forbidden origin" }, 403);
  }
  const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_TTL_MS);
  try {
    await prisma.$transaction(async (tx) => {
      const authorizationCode = await tx.extensionAuthCode.findUnique({
        where: { codeHash },
      });
      if (
        !authorizationCode ||
        authorizationCode.expiresAt <= new Date() ||
        authorizationCode.redirectUri !== parsed.data.redirectUri ||
        authorizationCode.installationId !== parsed.data.installationId ||
        !verifyPkceS256(
          parsed.data.codeVerifier,
          authorizationCode.codeChallenge,
        )
      ) {
        throw new InvalidGrantError();
      }

      const consumed = await tx.extensionAuthCode.deleteMany({
        where: { id: authorizationCode.id, codeHash },
      });
      if (consumed.count !== 1) throw new InvalidGrantError();

      await tx.extensionConnection.upsert({
        where: {
          userId_installationId: {
            userId: authorizationCode.userId,
            installationId: authorizationCode.installationId,
          },
        },
        update: {
          tokenHash,
          extensionId,
          scopes: ["EXTENSION_JOBS_WRITE", "EXTENSION_ACCOUNT_READ"],
          expiresAt,
          lastUsedAt: null,
          revokedAt: null,
        },
        create: {
          userId: authorizationCode.userId,
          installationId: authorizationCode.installationId,
          tokenHash,
          extensionId,
          scopes: ["EXTENSION_JOBS_WRITE", "EXTENSION_ACCOUNT_READ"],
          expiresAt,
        },
      });
    });
  } catch (error) {
    if (error instanceof InvalidGrantError) {
      return extensionApiResponse(origin, { error: "Invalid grant" }, 400);
    }
    throw error;
  }

  return extensionApiResponse(origin, {
    accessToken,
    tokenType: "Bearer",
    scope: EXTENSION_SCOPE,
    expiresAt: expiresAt.toISOString(),
  });
}
