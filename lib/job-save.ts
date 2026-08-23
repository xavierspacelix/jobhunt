import { prisma } from "@/lib/db"
import { Prisma } from "@/lib/generated/prisma/client"
import { z } from "zod"

export const jobInputSchema = z.object({
  title: z.string().min(1).max(300),
  company: z.string().max(300).optional(),
  location: z.string().max(300).optional(),
  salary: z.string().max(200).optional(),
  source: z.enum(["GLINTS", "JOBSTREET"]),
  sourceUrl: z.string().url(),
  description: z.string().max(50000).optional(),
  postedAt: z.string().optional(),
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

function blankToNull(v?: string): string | null {
  return v && v.trim() !== "" ? v.trim() : null
}

export type JobSaveInput = {
  title: string
  company?: string
  location?: string | null
  salary?: string | null
  source: "GLINTS" | "JOBSTREET"
  sourceUrl: string
  description?: string | null
  postedAt?: Date | null
  employmentType?: string | null
  experience?: string | null
  education?: string | null
  category?: string | null
  recruiter?: string | null
  skills?: string[]
  externalJobId?: string | null
  shareToken?: string | null
  companyRefId?: string | null
  companyDetails?: Prisma.InputJsonValue
  closed?: boolean
}

// Single source of truth for storing a parsed job. Used by both the manual
// paste flow and the browser-extension ingest endpoint.
export async function saveScrapedJob(job: JobSaveInput) {
  const title = job.title
  const company = job.company ?? ""
  const location = blankToNull(job.location ?? undefined)
  const salary = blankToNull(job.salary ?? undefined)
  const description = blankToNull(job.description ?? undefined)
  const postedAt = job.postedAt ?? null
  const employmentType = blankToNull(job.employmentType ?? undefined)
  const experience = blankToNull(job.experience ?? undefined)
  const education = blankToNull(job.education ?? undefined)
  const category = blankToNull(job.category ?? undefined)
  const recruiter = blankToNull(job.recruiter ?? undefined)
  const externalJobId = blankToNull(job.externalJobId ?? undefined)
  const shareToken = blankToNull(job.shareToken ?? undefined)
  const companyRefId = blankToNull(job.companyRefId ?? undefined)
  const skills = job.skills && job.skills.length ? job.skills : []
  const companyDetails = job.companyDetails

  return prisma.job.upsert({
    where: { sourceUrl: job.sourceUrl },
    update: {
      title,
      company,
      location,
      salary,
      description,
      postedAt,
      source: job.source,
      employmentType,
      experience,
      education,
      category,
      recruiter,
      skills,
      externalJobId,
      shareToken,
      companyRefId,
      companyDetails,
    },
    create: {
      title,
      company,
      location,
      salary,
      description,
      postedAt,
      source: job.source,
      sourceUrl: job.sourceUrl,
      employmentType,
      experience,
      education,
      category,
      recruiter,
      skills,
      externalJobId,
      shareToken,
      companyRefId,
      companyDetails,
    },
  })
}
