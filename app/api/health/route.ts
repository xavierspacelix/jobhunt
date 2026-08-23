import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

// Lightweight unauthenticated probe so the browser extension can detect whether
// a local dev server (http://localhost:3000) is running and auto-use it.
export async function GET() {
  const headers = { "Access-Control-Allow-Origin": "*" }
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true }, { headers })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers })
  }
}
