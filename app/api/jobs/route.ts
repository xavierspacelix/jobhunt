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

  const job = await prisma.job.upsert({
    where: { sourceUrl: data.sourceUrl },
    update: { title, company, location, salary, description, postedAt, source: data.source },
    create: {
      title,
      company,
      location,
      salary,
      description,
      postedAt,
      source: data.source,
      sourceUrl: data.sourceUrl,
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
  return NextResponse.json({ jobs })
})
