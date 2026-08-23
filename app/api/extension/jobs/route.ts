import { Prisma } from "@/lib/generated/prisma/client";

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

export const runtime = "nodejs";

export const OPTIONS = extensionOptionsResponse;

export async function POST(request: Request) {
  const origin = getExtensionRequestOrigin(request);
  if (!origin) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const address = getClientAddress(request);
  if (
    !extensionApiRateLimit(`ip:${address}`)
  ) {
    return extensionApiResponse(origin, { error: "Rate limit exceeded" }, 429);
  }

  const connection = await authenticateExtensionRequest(request);
  if (!connection) {
    return extensionApiResponse(origin, { error: "Unauthorized" }, 401);
  }
  if (
    !extensionJobRateLimit(`connection:${connection.id}`) ||
    !extensionJobRateLimit(`token:${connection.tokenHash}`)
  ) {
    return extensionApiResponse(origin, { error: "Rate limit exceeded" }, 429);
  }

  const rawBody = await readBoundedRequestBody(request, 64_000);
  if (!rawBody.ok) {
    return extensionApiResponse(
      origin,
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
      origin,
      { error: "Invalid job payload", issues: parsed.error.flatten() },
      400,
    );
  }

  const data = parsed.data;
  const dedupeKey = extensionJobDedupeKey(connection.userId, data.sourceUrl);
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
    return savedJob;
  });

  await markExtensionSave(connection.id);

  return extensionApiResponse(origin, { job });
}
