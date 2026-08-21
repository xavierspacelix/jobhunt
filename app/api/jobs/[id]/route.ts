import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export const GET = auth(async (
  req,
  { params }: { params: Promise<{ id: string }> },
) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) {
    return NextResponse.json({ error: "Lowongan tidak ditemukan" }, { status: 404 })
  }
  return NextResponse.json({ job })
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
  const existing = await prisma.job.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
  await prisma.job.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
