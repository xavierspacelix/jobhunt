import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { scrapeUser, runAllScrapes } from "@/lib/cron/scrape"

export const runtime = "nodejs"
export const maxDuration = 300

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const all = new URL(req.url).searchParams.get("all") === "1"

  if (all) {
    const results = await runAllScrapes()
    return NextResponse.json({ results })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, profile: { select: { skills: true } } },
  })
  if (!user || !user.profile) {
    return NextResponse.json({ error: "Profil belum ada" }, { status: 400 })
  }

  const result = await scrapeUser(user.id, user.profile.skills ?? [])
  return NextResponse.json({ result })
})
