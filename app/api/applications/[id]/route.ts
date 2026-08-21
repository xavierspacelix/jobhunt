import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { STATUS_ORDER } from "@/lib/kanban"

export const runtime = "nodejs"

const patchInput = z.object({
  status: z.enum(STATUS_ORDER as unknown as [string, ...string[]]).optional(),
  notes: z.string().max(5000).optional(),
  appliedAt: z.string().nullable().optional(),
  nextFollowUpAt: z.string().nullable().optional(),
})

export const GET = auth(async (
  req,
  { params }: { params: Promise<{ id: string }> },
) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const application = await prisma.application.findFirst({
    where: { id, user: { email } },
    include: { job: true },
  })
  if (!application) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
  return NextResponse.json({ application })
})

export const PATCH = auth(async (
  req,
  { params }: { params: Promise<{ id: string }> },
) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const json = await req.json().catch(() => null)
  const parsed = patchInput.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const existing = await prisma.application.findFirst({
    where: { id, user: { email } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: data.status as
        | "WISHLIST"
        | "APPLIED"
        | "SCREENING"
        | "INTERVIEW"
        | "OFFER"
        | "REJECTED"
        | undefined,
      notes: data.notes,
      appliedAt:
        data.appliedAt === null
          ? null
          : data.appliedAt
            ? new Date(data.appliedAt)
            : undefined,
      nextFollowUpAt:
        data.nextFollowUpAt === null
          ? null
          : data.nextFollowUpAt
            ? new Date(data.nextFollowUpAt)
            : undefined,
    },
    include: { job: true },
  })

  return NextResponse.json({ application: updated })
})

export const DELETE = auth(async (
  req,
  { params }: { params: Promise<{ id: string }> },
) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const existing = await prisma.application.findFirst({
    where: { id, user: { email } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
  await prisma.application.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
