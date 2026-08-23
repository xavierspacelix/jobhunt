import { prisma } from "@/lib/db";
import { createMatchCacheKey } from "@/lib/match";
import {
  recommendationPreviewMatchesProfile,
  type RecommendationPreview,
} from "@/lib/job-preview";

export async function persistRecommendationPreview(
  userId: string,
  preview: RecommendationPreview,
) {
  const { job: data, match } = preview;

  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({ where: { userId } });
    if (
      !profile ||
      !recommendationPreviewMatchesProfile(preview, profile.updatedAt)
    ) {
      return null;
    }

    const job = await tx.job.upsert({
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
      where: { userId_jobId: { userId, jobId: job.id } },
      update: { score: match.score },
      create: { userId, jobId: job.id, score: match.score },
    });
    await tx.savedJob.upsert({
      where: { userId_jobId: { userId, jobId: job.id } },
      update: {},
      create: { userId, jobId: job.id, origin: "SEARCH" },
    });
    const cacheKey = createMatchCacheKey(profile, job);
    await tx.match.upsert({
      where: { userId_jobId: { userId, jobId: job.id } },
      update: {
        score: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        source: match.source,
        cacheKey,
      },
      create: {
        userId,
        jobId: job.id,
        score: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        source: match.source,
        cacheKey,
      },
    });
    return job;
  });
}
