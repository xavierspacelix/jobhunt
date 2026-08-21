import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCvUrl } from "@/lib/storage";

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

  return Response.json({ profile, cvUrl });
});

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function asString(value: unknown): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

function asJsonArray(value: unknown): Json[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as Json[];
}

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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const data: Record<string, unknown> = {};
  const strFields = [
    "fullName",
    "headline",
    "location",
    "phone",
    "summary",
  ] as const;
  for (const f of strFields) {
    const v = asString(body[f]);
    if (v !== undefined) data[f] = v;
  }
  const arrFields = ["skills", "links"] as const;
  for (const f of arrFields) {
    const v = asStringArray(body[f]);
    if (v !== undefined) data[f] = v;
  }
  const jsonFields = ["experience", "education", "certifications"] as const;
  for (const f of jsonFields) {
    const v = asJsonArray(body[f]);
    if (v !== undefined) data[f] = v;
  }

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  const cvUrl = profile.cvKey ? await getCvUrl(profile.cvKey) : null;
  return Response.json({ profile, cvUrl });
});
