import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { scoreMatch } from "@/lib/match"

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

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  await prisma.recommendation.upsert({
    where: { userId_jobId: { userId: user.id, jobId: job.id } },
    update: {},
    create: { userId: user.id, jobId: job.id },
  })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  })

  let matchScore: number | null = null
  if (profile) {
    const result = await scoreMatch(profile, job)
    matchScore = result.score
    await prisma.match.upsert({
      where: { userId_jobId: { userId: user.id, jobId: job.id } },
      update: {
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        source: result.source,
      },
      create: {
        userId: user.id,
        jobId: job.id,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        source: result.source,
      },
    })
  }

  return NextResponse.json({ ok: true, jobId: job.id, matchScore })
})
