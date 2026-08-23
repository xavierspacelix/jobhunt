import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  jobVisibilityWhere,
  manualJobInputSchema,
  privateJobDedupeKey,
  savedJobDisplayOrigin,
  type TrustedJobPayload,
} from "@/lib/job-data";
import { verifyJobPreview } from "@/lib/job-preview";

export const runtime = "nodejs";

const tokenInputSchema = z.object({ previewToken: z.string().max(100000) });

function blankToNull(value?: string): string | null {
  return value?.trim() || null;
}

function trustedCreateData(data: TrustedJobPayload) {
  return {
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
  };
}

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const tokenInput = tokenInputSchema.safeParse(json);
  const trusted = tokenInput.success
    ? verifyJobPreview(tokenInput.data.previewToken, user.id)
    : null;

  if (tokenInput.success && !trusted) {
    return NextResponse.json(
      { error: "Preview lowongan kedaluwarsa atau tidak valid. Ambil ulang preview." },
      { status: 400 },
    );
  }

  if (trusted) {
    const job = await prisma.$transaction(async (tx) => {
      const savedJob = await tx.job.upsert({
        where: { dedupeKey: trusted.sourceUrl },
        update: trustedCreateData(trusted),
        create: {
          ...trustedCreateData(trusted),
          scope: "SHARED",
          ownerId: null,
          dedupeKey: trusted.sourceUrl,
        },
      });
      await tx.savedJob.upsert({
        where: { userId_jobId: { userId: user.id, jobId: savedJob.id } },
        update: { origin: "MANUAL" },
        create: { userId: user.id, jobId: savedJob.id, origin: "MANUAL" },
      });
      return savedJob;
    });
    return NextResponse.json({ job, scope: job.scope, trusted: true });
  }

  const parsed = manualJobInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data lowongan tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const privateData = {
    title: data.title,
    company: data.company?.trim() || "",
    location: blankToNull(data.location),
    salary: blankToNull(data.salary),
    description: blankToNull(data.description),
    postedAt: data.postedAt ? new Date(data.postedAt) : null,
    source: data.source,
    sourceUrl: data.sourceUrl,
    employmentType: blankToNull(data.employmentType),
    experience: blankToNull(data.experience),
    education: blankToNull(data.education),
    category: blankToNull(data.category),
    recruiter: blankToNull(data.recruiter),
    skills: data.skills ?? [],
    externalJobId: blankToNull(data.externalJobId),
    shareToken: blankToNull(data.shareToken),
    companyRefId: blankToNull(data.companyRefId),
    companyDetails: data.companyDetails,
  };
  const dedupeKey = privateJobDedupeKey(user.id, data.sourceUrl);
  const job = await prisma.$transaction(async (tx) => {
    const savedJob = await tx.job.upsert({
      where: { dedupeKey },
      update: privateData,
      create: {
        ...privateData,
        scope: "PRIVATE",
        ownerId: user.id,
        dedupeKey,
      },
    });
    await tx.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId: savedJob.id } },
      update: { origin: "MANUAL" },
      create: { userId: user.id, jobId: savedJob.id, origin: "MANUAL" },
    });
    return savedJob;
  });

  return NextResponse.json({ job, scope: job.scope, trusted: false });
});

export const GET = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const jobs = await prisma.job.findMany({
    where: jobVisibilityWhere(user.id),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      savedBy: {
        where: { userId: user.id },
        select: { origin: true },
      },
      matches: {
        where: { userId: user.id },
        select: {
          score: true,
          matchedSkills: true,
          missingSkills: true,
        },
      },
      recommendations: {
        where: { userId: user.id },
        select: { id: true },
      },
      applications: {
        where: { userId: user.id },
        select: { id: true },
      },
    },
  });

  const jobsWithScore = jobs.map(
    ({ savedBy, matches, recommendations, applications, ...job }) => {
    const savedOrigin = savedBy[0]?.origin;
    return {
      ...job,
      matchScore: matches[0]?.score ?? null,
      matchedSkills: matches[0]?.matchedSkills ?? [],
      missingSkills: matches[0]?.missingSkills ?? [],
      tracked: applications.length > 0,
      origin: savedJobDisplayOrigin(savedOrigin, recommendations.length > 0),
    };
    },
  );

  return NextResponse.json({ jobs: jobsWithScore });
});
