import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export const GET = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const recs = await prisma.recommendation.findMany({
    where: { user: { email } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { job: true },
  })

  const matches = await prisma.match.findMany({
    where: { user: { email } },
    select: { jobId: true, score: true },
  })
  const scoreByJob = new Map(matches.map((m) => [m.jobId, m.score]))

  const jobs = recs.map((r) => ({
    ...r.job,
    matchScore: scoreByJob.get(r.job.id) ?? null,
  }))

  return NextResponse.json({ jobs })
})
