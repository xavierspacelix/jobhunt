import { z } from "zod";

import { dateStringSchema } from "@/lib/application-input";

const SUPPORTED_JOB_HOSTS = [
  { host: "glints.com", source: "GLINTS" as const },
  { host: "jobstreet.co.id", source: "JOBSTREET" as const },
  { host: "jobstreet.com", source: "JOBSTREET" as const },
];

export function getSupportedJobSource(url: string) {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      return null;
    }
    const hostname = parsed.hostname.toLowerCase();
    return (
      SUPPORTED_JOB_HOSTS.find(
        ({ host }) => hostname === host || hostname.endsWith(`.${host}`),
      )?.source ?? null
    );
  } catch {
    return null;
  }
}

export const supportedJobUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((url) => getSupportedJobSource(url) !== null, {
    message: "URL harus HTTPS dari Glints atau Jobstreet",
  });

const nullableText = (max: number) => z.string().max(max).nullable();
const httpUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "URL harus menggunakan HTTP atau HTTPS");

export const trustedJobPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    company: z.string().trim().max(300),
    location: nullableText(300),
    salary: nullableText(200),
    source: z.enum(["GLINTS", "JOBSTREET"]),
    sourceUrl: supportedJobUrlSchema,
    description: nullableText(50000),
    postedAt: z.string().datetime().nullable(),
    employmentType: nullableText(200),
    experience: nullableText(200),
    education: nullableText(200),
    category: nullableText(300),
    recruiter: nullableText(300),
    skills: z.array(z.string().max(200)).max(50),
    externalJobId: nullableText(200),
    shareToken: nullableText(200),
    companyRefId: nullableText(200),
    companyDetails: z.record(z.string().max(2000)).nullable(),
  })
  .strict()
  .superRefine((job, ctx) => {
    if (getSupportedJobSource(job.sourceUrl) !== job.source) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "Sumber tidak cocok dengan URL",
      });
    }
  });

export type TrustedJobPayload = z.infer<typeof trustedJobPayloadSchema>;

type TrustedJobCandidate = {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  salary?: string | null;
  source: "GLINTS" | "JOBSTREET";
  sourceUrl: string;
  description?: string | null;
  postedAt?: string | Date | null;
  employmentType?: string | null;
  experience?: string | null;
  education?: string | null;
  category?: string | null;
  recruiter?: string | null;
  skills?: string[] | null;
  externalJobId?: string | null;
  shareToken?: string | null;
  companyRefId?: string | null;
  companyDetails?: unknown;
};

export function parseTrustedJobPayload(input: TrustedJobCandidate) {
  const nullable = (value?: string | null) => value?.trim() || null;
  const postedAt = input.postedAt ? new Date(input.postedAt) : null;
  const companyDetails =
    input.companyDetails &&
    typeof input.companyDetails === "object" &&
    !Array.isArray(input.companyDetails)
    ? Object.fromEntries(
        Object.entries(input.companyDetails).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : null;

  return trustedJobPayloadSchema.safeParse({
    title: input.title?.trim() ?? "",
    company: input.company?.trim() ?? "",
    location: nullable(input.location),
    salary: nullable(input.salary),
    source: input.source,
    sourceUrl: input.sourceUrl,
    description: nullable(input.description),
    postedAt:
      postedAt && !Number.isNaN(postedAt.getTime())
        ? postedAt.toISOString()
        : null,
    employmentType: nullable(input.employmentType),
    experience: nullable(input.experience),
    education: nullable(input.education),
    category: nullable(input.category),
    recruiter: nullable(input.recruiter),
    skills: input.skills ?? [],
    externalJobId: nullable(input.externalJobId),
    shareToken: nullable(input.shareToken),
    companyRefId: nullable(input.companyRefId),
    companyDetails: companyDetails ?? null,
  });
}

export const manualJobInputSchema = z
  .object({
    previewToken: z.string().max(100000).optional(),
    title: z.string().trim().min(1).max(300),
    company: z.string().max(300).optional(),
    location: z.string().max(300).optional(),
    salary: z.string().max(200).optional(),
    source: z.enum(["GLINTS", "JOBSTREET"]),
    sourceUrl: supportedJobUrlSchema,
    description: z.string().max(50000).optional(),
    postedAt: dateStringSchema.optional(),
    employmentType: z.string().max(200).optional(),
    experience: z.string().max(200).optional(),
    education: z.string().max(200).optional(),
    category: z.string().max(300).optional(),
    recruiter: z.string().max(300).optional(),
    skills: z.array(z.string().max(200)).max(50).optional(),
    externalJobId: z.string().max(200).optional(),
    shareToken: z.string().max(200).optional(),
    companyRefId: z.string().max(200).optional(),
    companyDetails: z.record(z.string().max(2000)).optional(),
  })
  .strict()
  .superRefine((job, ctx) => {
    if (getSupportedJobSource(job.sourceUrl) !== job.source) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "Sumber tidak cocok dengan URL",
      });
    }
  });

export const extensionJobInputSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    company: z.string().trim().max(300),
    location: nullableText(300),
    salary: nullableText(200),
    source: z.enum(["GLINTS", "JOBSTREET"]),
    sourceUrl: supportedJobUrlSchema,
    description: nullableText(50000),
    postedAt: z.string().datetime().nullable(),
    employmentType: nullableText(200),
    experience: nullableText(200),
    education: nullableText(200),
    category: nullableText(300),
    recruiter: nullableText(300),
    skills: z.array(z.string().trim().min(1).max(200)).max(50),
    externalJobId: nullableText(200),
    companyDetails: z
      .object({
        name: nullableText(300).optional(),
        industry: nullableText(300).optional(),
        size: nullableText(200).optional(),
        website: httpUrlSchema.nullable().optional(),
        linkedin: httpUrlSchema.nullable().optional(),
        instagram: httpUrlSchema.nullable().optional(),
        twitter: httpUrlSchema.nullable().optional(),
        facebook: httpUrlSchema.nullable().optional(),
        address: nullableText(500).optional(),
        about: nullableText(5000).optional(),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((job, ctx) => {
    if (getSupportedJobSource(job.sourceUrl) !== job.source) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source"],
        message: "Sumber tidak cocok dengan URL",
      });
    }
  });

export function privateJobDedupeKey(userId: string, sourceUrl: string): string {
  return `private:${userId}:${sourceUrl}`;
}

export function extensionJobDedupeKey(userId: string, sourceUrl: string): string {
  return `extension:${userId}:${sourceUrl}`;
}

export function extensionJobsWhere(userId: string) {
  return {
    scope: "PRIVATE" as const,
    ownerId: userId,
    savedBy: { some: { userId, origin: "EXTENSION" as const } },
  };
}

export function savedJobDisplayOrigin(
  savedOrigin: "MANUAL" | "SEARCH" | "EXTENSION" | undefined,
  hasRecommendation: boolean,
): "manual" | "auto" | "both" | null {
  const manual = savedOrigin === "MANUAL";
  if (manual && hasRecommendation) return "both";
  if (hasRecommendation || savedOrigin === "SEARCH") return "auto";
  return manual ? "manual" : null;
}

export function jobVisibilityWhere(userId: string) {
  const currentUserReference = {
    OR: [
      { savedBy: { some: { userId } } },
      { applications: { some: { userId } } },
      { recommendations: { some: { userId } } },
      { matches: { some: { userId } } },
    ],
  };
  return {
    OR: [
      { scope: "PRIVATE" as const, ownerId: userId },
      { scope: "SHARED" as const, ...currentUserReference },
    ],
  };
}
