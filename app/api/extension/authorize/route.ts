import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EXTENSION_AUTH_CODE_TTL_MS,
  generateExtensionSecret,
  hashExtensionSecret,
  isValidExtensionRedirectUri,
  isValidExtensionInstallationId,
  isValidExtensionState,
  isValidPkceChallenge,
} from "@/lib/extension-auth";
import { extensionAuthorizeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const authorizeSchema = z
  .object({
    redirectUri: z.string().refine(isValidExtensionRedirectUri),
    state: z.string().refine(isValidExtensionState),
    codeChallenge: z.string().refine(isValidPkceChallenge),
    installationId: z.string().refine(isValidExtensionInstallationId),
  })
  .strict();

export const POST = auth(async (request) => {
  const email = request.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!extensionAuthorizeRateLimit(email.toLowerCase())) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan koneksi. Coba lagi nanti." },
      { status: 429 },
    );
  }

  const parsed = authorizeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid authorization request" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = generateExtensionSecret();
  await prisma.$transaction([
    prisma.extensionAuthCode.deleteMany({
      where: { expiresAt: { lte: new Date() }, userId: { not: user.id } },
    }),
    prisma.extensionAuthCode.upsert({
      where: { userId: user.id },
      update: {
        codeHash: hashExtensionSecret(code),
        redirectUri: parsed.data.redirectUri,
        codeChallenge: parsed.data.codeChallenge,
        installationId: parsed.data.installationId,
        expiresAt: new Date(Date.now() + EXTENSION_AUTH_CODE_TTL_MS),
      },
      create: {
          userId: user.id,
          codeHash: hashExtensionSecret(code),
          redirectUri: parsed.data.redirectUri,
          codeChallenge: parsed.data.codeChallenge,
          installationId: parsed.data.installationId,
          expiresAt: new Date(Date.now() + EXTENSION_AUTH_CODE_TTL_MS),
      },
    }),
  ]);

  const redirectUrl = new URL(parsed.data.redirectUri);
  redirectUrl.searchParams.set("code", code);
  redirectUrl.searchParams.set("state", parsed.data.state);
  return NextResponse.json({ redirectUrl: redirectUrl.toString() });
});
