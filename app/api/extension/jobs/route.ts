import { Prisma, type Job, type Profile } from "@/lib/generated/prisma/client";

import {
  authenticateExtensionRequest,
  extensionApiResponse,
  extensionOptionsResponse,
  getExtensionRequestOrigin,
  getClientAddress,
  markExtensionSave,
  readBoundedRequestBody,
} from "@/lib/extension-api";
import { prisma } from "@/lib/db";
import { extensionJobDedupeKey, extensionJobInputSchema } from "@/lib/job-data";
import { extensionApiRateLimit, extensionJobRateLimit } from "@/lib/rate-limit";
import {
  scoreMatch,
  createMatchCacheKey,
  MATCH_SAVE_THRESHOLD,
  type MatchResult,
} from "@/lib/match";

export const runtime = "nodejs";

export const OPTIONS = extensionOptionsResponse;

export async function POST(request: Request) {
  const connection = await authenticateExtensionRequest(request);
  if (!connection) {
    const origin = getExtensionRequestOrigin(request);
    if (!origin) {
      return Response.json({ job: null, error: "Forbidden origin" }, { status: 403 });
    }
    return extensionApiResponse(origin, { error: "Unauthorized" }, 401);
  }
  const requestOrigin = request.headers.get("origin");
  const corsOrigin = requestOrigin || `chrome-extension://${connection.extensionId}`;
  const address = getClientAddress(request);
  if (!extensionApiRateLimit(`ip:${address}`)) {
    return extensionApiResponse(corsOrigin, { error: "Rate limit exceeded" }, 429);
  }

  if (
    !extensionJobRateLimit(`connection:${connection.id}`) ||
    !extensionJobRateLimit(`token:${connection.tokenHash}`)
  ) {
    return extensionApiResponse(corsOrigin, { error: "Rate limit exceeded" }, 429);
  }

  const rawBody = await readBoundedRequestBody(request, 64_000);
  if (!rawBody.ok) {
    return extensionApiResponse(
      corsOrigin,
      { error: rawBody.reason === "too_large" ? "Job payload too large" : "Invalid request" },
      rawBody.reason === "too_large" ? 413 : 400,
    );
  }
  const parsed = extensionJobInputSchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody.text);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) {
    return extensionApiResponse(
      corsOrigin,
      { error: "Invalid job payload", issues: parsed.error.flatten() },
      400,
    );
  }

  const data = parsed.data;
  const forceSave = data.forceSave === true;
  const skipMatch = data.skipMatch === true;

  const jobData = {
    title: data.title,
    company: data.company,
    location: data.location,
    salary: data.salary,
    source: data.source,
    sourceUrl: data.sourceUrl,
    description: data.description,
    postedAt: data.postedAt ? new Date(data.postedAt) : null,
    employmentType: data.employmentType,
    experience: data.experience,
    education: data.education,
    category: data.category,
    recruiter: data.recruiter,
    skills: data.skills,
    externalJobId: data.externalJobId,
    companyDetails: data.companyDetails ?? Prisma.DbNull,
  };

  const profile = await prisma.profile.findUnique({
    where: { userId: connection.userId },
  });

  let matchResult: MatchResult | null = null;
  let decision: "save" | "review" | "needsCv" = "save";
  if (!profile) {
    decision = "needsCv";
  } else {
    const jobForMatch = {
      ...jobData,
      id: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      scope: "PRIVATE",
      ownerId: connection.userId,
    } as unknown as Job;
    matchResult = await scoreMatch(profile as Profile, jobForMatch);
    decision =
      matchResult.score >= MATCH_SAVE_THRESHOLD ? "save" : "review";
  }

  if (decision === "needsCv" && !skipMatch) {
    return extensionApiResponse(
      corsOrigin,
      { saved: false, needsCv: true },
      200,
    );
  }
  if (decision === "review" && !forceSave) {
    return extensionApiResponse(
      corsOrigin,
      {
        saved: false,
        review: true,
        matchScore: matchResult?.score ?? null,
        matchedSkills: matchResult?.matchedSkills ?? [],
        missingSkills: matchResult?.missingSkills ?? [],
      },
      200,
    );
  }

  const dedupeKey = extensionJobDedupeKey(connection.userId, data.sourceUrl);
  const job = await prisma.$transaction(async (tx) => {
    const savedJob = await tx.job.upsert({
      where: { dedupeKey },
      update: jobData,
      create: {
        ...jobData,
        scope: "PRIVATE",
        ownerId: connection.userId,
        dedupeKey,
      },
    });
    await tx.savedJob.upsert({
      where: {
        userId_jobId: { userId: connection.userId, jobId: savedJob.id },
      },
      update: { origin: "EXTENSION" },
      create: {
        userId: connection.userId,
        jobId: savedJob.id,
        origin: "EXTENSION",
      },
    });
    if (matchResult) {
      const cacheKey = createMatchCacheKey(profile as Profile, savedJob);
      await tx.match.upsert({
        where: {
          userId_jobId: { userId: connection.userId, jobId: savedJob.id },
        },
        update: {
          score: matchResult.score,
          matchedSkills: matchResult.matchedSkills,
          missingSkills: matchResult.missingSkills,
          source: matchResult.source,
          cacheKey,
        },
        create: {
          userId: connection.userId,
          jobId: savedJob.id,
          score: matchResult.score,
          matchedSkills: matchResult.matchedSkills,
          missingSkills: matchResult.missingSkills,
          source: matchResult.source,
          cacheKey,
        },
      });
    }
    return savedJob;
  });

  await markExtensionSave(connection.id);

  return extensionApiResponse(corsOrigin, {
    job,
    saved: true,
    matchScore: matchResult?.score ?? null,
    matchedSkills: matchResult?.matchedSkills ?? [],
    missingSkills: matchResult?.missingSkills ?? [],
  });
}
