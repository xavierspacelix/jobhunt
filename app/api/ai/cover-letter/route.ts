import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { generateCoverLetter } from "@/lib/cover-letter"
import { rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const input = z.object({ applicationId: z.string().min(1) })

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = input.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "applicationId wajib diisi" },
      { status: 400 },
    )
  }
  const { applicationId } = parsed.data

  if (!rateLimit(`cover-letter:${email}`)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan, coba lagi nanti." },
      { status: 429 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true, user: { include: { profile: true } } },
  })
  if (!app) {
    return NextResponse.json(
      { error: "Lamaran tidak ditemukan" },
      { status: 404 },
    )
  }
  if (app.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!app.user.profile) {
    return NextResponse.json(
      { error: "Unggah CV dahulu untuk membuat cover letter." },
      { status: 400 },
    )
  }

  const coverLetter = await generateCoverLetter(app.user.profile, app.job)

  await prisma.application.update({
    where: { id: app.id },
    data: { coverLetter },
  })

  return NextResponse.json({ coverLetter })
})
