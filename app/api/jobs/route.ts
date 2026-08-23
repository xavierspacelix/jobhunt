import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { jobInputSchema, saveScrapedJob } from "@/lib/job-save"

export const runtime = "nodejs"

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = jobInputSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data lowongan tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const job = await saveScrapedJob({
    ...data,
    postedAt: data.postedAt ? new Date(data.postedAt) : null,
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

  const recs = await prisma.recommendation.findMany({
    where: { user: { email } },
    select: { jobId: true },
  })
  const autoJobIds = new Set(recs.map((r) => r.jobId))

  const jobsWithScore = jobs.map((job) => ({
    ...job,
    matchScore: scoreByJob.get(job.id) ?? null,
    origin: autoJobIds.has(job.id) ? "auto" : "manual",
  }))

  return NextResponse.json({ jobs: jobsWithScore })
})
