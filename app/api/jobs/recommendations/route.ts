import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createMatchCacheKey, scoreMatch } from "@/lib/match";
import { recommendationSaveRateLimit } from "@/lib/rate-limit";
import { verifyJobPreview } from "@/lib/job-preview";

export const runtime = "nodejs";

const inputSchema = z.object({ previewToken: z.string().min(1).max(100000) });

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!recommendationSaveRateLimit(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak penyimpanan, coba lagi nanti." },
      { status: 429 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Preview lowongan tidak valid" },
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
  const data = verifyJobPreview(parsed.data.previewToken, user.id);
  if (!data) {
    return NextResponse.json(
      { error: "Preview lowongan kedaluwarsa atau tidak valid" },
      { status: 400 },
    );
  }

  const job = await prisma.$transaction(async (tx) => {
    const savedJob = await tx.job.upsert({
      where: { dedupeKey: data.sourceUrl },
      update: {
        title: data.title,
        company: data.company,
        location: data.location,
        salary: data.salary,
        description: data.description,
        postedAt: data.postedAt ? new Date(data.postedAt) : null,
        source: data.source,
        sourceUrl: data.sourceUrl,
        employmentType: data.employmentType,
        experience: data.experience,
        education: data.education,
        category: data.category,
        recruiter: data.recruiter,
        skills: data.skills,
        externalJobId: data.externalJobId,
        shareToken: data.shareToken,
        companyRefId: data.companyRefId,
        companyDetails: data.companyDetails ?? undefined,
      },
      create: {
        scope: "SHARED",
        ownerId: null,
        dedupeKey: data.sourceUrl,
        title: data.title,
        company: data.company,
        location: data.location,
        salary: data.salary,
        description: data.description,
        postedAt: data.postedAt ? new Date(data.postedAt) : null,
        source: data.source,
        sourceUrl: data.sourceUrl,
        employmentType: data.employmentType,
        experience: data.experience,
        education: data.education,
        category: data.category,
        recruiter: data.recruiter,
        skills: data.skills,
        externalJobId: data.externalJobId,
        shareToken: data.shareToken,
        companyRefId: data.companyRefId,
        companyDetails: data.companyDetails ?? undefined,
      },
    });
    await tx.recommendation.upsert({
      where: { userId_jobId: { userId: user.id, jobId: savedJob.id } },
      update: {},
      create: { userId: user.id, jobId: savedJob.id },
    });
    await tx.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId: savedJob.id } },
      update: {},
      create: { userId: user.id, jobId: savedJob.id, origin: "SEARCH" },
    });
    return savedJob;
  });

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  let matchScore: number | null = null;
  if (profile) {
    const result = await scoreMatch(profile, job);
    const cacheKey = createMatchCacheKey(profile, job);
    matchScore = result.score;
    await prisma.$transaction([
      prisma.recommendation.update({
        where: { userId_jobId: { userId: user.id, jobId: job.id } },
        data: { score: result.score },
      }),
      prisma.match.upsert({
        where: { userId_jobId: { userId: user.id, jobId: job.id } },
        update: {
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          source: result.source,
          cacheKey,
        },
        create: {
          userId: user.id,
          jobId: job.id,
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          source: result.source,
          cacheKey,
        },
      }),
    ]);
  }

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    job,
    scope: job.scope,
    matchScore,
  });
});
