import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { parseGlints } from "@/lib/scrapers/glints"
import { parseJobstreet } from "@/lib/scrapers/jobstreet"
import { toJobData } from "@/lib/job-search"
import { saveScrapedJob } from "@/lib/job-save"
import { SEARCH_HOSTS } from "@/lib/scrapers/search"

export const runtime = "nodejs"

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || (process.env.AUTH_URL ?? "*")
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

const itemSchema = z.object({
  url: z.string().url(),
  html: z.string().min(1),
})
const bodySchema = z.object({
  url: z.string().url().optional(),
  html: z.string().min(1).optional(),
  jobs: z.array(itemSchema).max(50).optional(),
})

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
}

// Auth: the caller must be logged in to JobHunter. The browser extension sends
// the session cookie via `credentials: "include"`; cross-site attachment relies
// on the session cookie being SameSite=None in production.
export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json(
      { error: "Unauthorized", loginRequired: true },
      { status: 401, headers: corsHeaders(req) },
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body tidak valid", issues: parsed.error.flatten() },
      { status: 400, headers: corsHeaders(req) },
    )
  }

  const items =
    parsed.data.jobs ??
    (parsed.data.url && parsed.data.html
      ? [{ url: parsed.data.url, html: parsed.data.html }]
      : [])

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada url/html untuk diproses" },
      { status: 400, headers: corsHeaders(req) },
    )
  }

  let saved = 0
  let skipped = 0
  const results: { url: string; saved: boolean; title?: string; reason?: string }[] = []

  for (const { url, html } of items) {
    let host: string
    try {
      host = new URL(url).hostname.toLowerCase()
    } catch {
      skipped++
      results.push({ url, saved: false, reason: "URL tidak valid" })
      continue
    }
    const source = SEARCH_HOSTS.GLINTS.some(
      (h) => host === h || host.endsWith(`.${h}`),
    )
      ? "GLINTS"
      : "JOBSTREET"

    const fields = source === "GLINTS" ? parseGlints(html, url) : parseJobstreet(html, url)
    const job = toJobData(fields, source, url)
    if (!job) {
      skipped++
      results.push({ url, saved: false, reason: "Tidak bisa diparse" })
      continue
    }
    await saveScrapedJob(job)
    saved++
    results.push({ url, saved: true, title: job.title })
  }

  return NextResponse.json({ saved, skipped, results }, { headers: corsHeaders(req) })
})
