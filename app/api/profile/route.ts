import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCvUrl } from "@/lib/storage";
import { parseProfileUpdate } from "@/lib/profile-input";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";

export const GET = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  const cvUrl = profile?.cvKey ? await getCvUrl(profile.cvKey) : null;

  const safeProfile = profile
    ? (() => {
        const { llmApiKey, ...rest } = profile;
        return { ...rest, hasLlmApiKey: Boolean(llmApiKey) };
      })()
    : null;

  return Response.json({ profile: safeProfile, cvUrl });
});

export const PUT = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = parseProfileUpdate(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Data profil tidak valid",
        issues: parsed.error.flatten(),
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }
  const data = parsed.data;

  const llmApiKey =
    data.llmApiKey !== undefined
      ? data.llmApiKey
        ? encryptSecret(data.llmApiKey)
        : null
      : undefined;

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: { ...data, llmApiKey },
    create: { userId: user.id, ...data, llmApiKey },
  });

  const cvUrl = profile.cvKey ? await getCvUrl(profile.cvKey) : null;
  return Response.json({ profile, cvUrl });
});
