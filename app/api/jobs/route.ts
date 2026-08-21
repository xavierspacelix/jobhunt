import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

const jobInput = z.object({
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

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = jobInput.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data lowongan tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const title = blankToNull(data.title)!
  const company = data.company?.trim() || ""
  const location = blankToNull(data.location)
  const salary = blankToNull(data.salary)
  const description = blankToNull(data.description)
  const postedAt = data.postedAt ? new Date(data.postedAt) : null
  const employmentType = blankToNull(data.employmentType)
  const experience = blankToNull(data.experience)
  const education = blankToNull(data.education)
  const category = blankToNull(data.category)
  const recruiter = blankToNull(data.recruiter)
  const externalJobId = blankToNull(data.externalJobId)
  const shareToken = blankToNull(data.shareToken)
  const companyRefId = blankToNull(data.companyRefId)
  const skills = data.skills && data.skills.length ? data.skills : []
  const companyDetails = data.companyDetails

  const job = await prisma.job.upsert({
    where: { sourceUrl: data.sourceUrl },
    update: {
      title,
      company,
      location,
      salary,
      description,
      postedAt,
      source: data.source,
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
      source: data.source,
      sourceUrl: data.sourceUrl,
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

  return NextResponse.json({ job })
})

export const GET = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const matches = await prisma.match.findMany({
    where: { user: { email } },
    select: { jobId: true, score: true },
  })
  const scoreByJob = new Map(matches.map((m) => [m.jobId, m.score]))

  const jobsWithScore = jobs.map((job) => ({
    ...job,
    matchScore: scoreByJob.get(job.id) ?? null,
  }))

  return NextResponse.json({ jobs: jobsWithScore })
})
