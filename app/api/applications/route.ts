import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

const createInput = z.object({ jobId: z.string().min(1) })

export const GET = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const applications = await prisma.application.findMany({
    where: { user: { email } },
    include: { job: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ applications })
})

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const json = await req.json().catch(() => null)
  const parsed = createInput.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "jobId wajib diisi" }, { status: 400 })
  }
  const { jobId } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  })
  if (!job) {
    return NextResponse.json(
      { error: "Lowongan tidak ditemukan" },
      { status: 404 },
    )
  }

  const application = await prisma.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    update: {},
    create: { userId: user.id, jobId, status: "WISHLIST" },
    include: { job: true },
  })

  return NextResponse.json({ application })
})
