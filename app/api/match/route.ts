import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createMatchCacheKey, scoreMatch } from "@/lib/match";
import { matchRateLimit } from "@/lib/rate-limit";
import { jobVisibilityWhere } from "@/lib/job-data";

export const runtime = "nodejs";

const input = z.object({ jobId: z.string().min(1) });

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = input.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "jobId wajib diisi" }, { status: 400 });
  }
  const { jobId } = parsed.data;

  if (!matchRateLimit(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan, coba lagi nanti." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Unggah CV dahulu untuk mencocokkan." },
      { status: 400 },
    );
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, ...jobVisibilityWhere(user.id) },
  });
  if (!job) {
    return NextResponse.json(
      { error: "Lowongan tidak ditemukan" },
      { status: 404 },
    );
  }

  const cacheKey = createMatchCacheKey(profile, job);

  const existing = await prisma.match.findUnique({
    where: { userId_jobId: { userId: user.id, jobId } },
  });

  if (existing && existing.cacheKey === cacheKey) {
    return NextResponse.json({
      score: existing.score,
      matchedSkills: existing.matchedSkills,
      missingSkills: existing.missingSkills,
      source: existing.source ?? undefined,
      cached: true,
    });
  }

  const result = await scoreMatch(profile, job);

  await prisma.match.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    update: {
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      source: result.source,
      cacheKey,
    },
    create: {
      userId: user.id,
      jobId,
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      source: result.source,
      cacheKey,
    },
  });

  return NextResponse.json({ ...result, cached: false });
});
