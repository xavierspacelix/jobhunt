import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { assertPublicHostname } from "@/lib/ssrf"
import { fetchRenderedHtml } from "@/lib/scrapers/render"
import { parseGlints } from "@/lib/scrapers/glints"
import { parseJobstreet } from "@/lib/scrapers/jobstreet"
import type { JobSource } from "@/lib/scrapers/types"

export const runtime = "nodejs"

const ALLOWED = [
  { host: "glints.com", source: "GLINTS" as JobSource },
  { host: "jobstreet.co.id", source: "JOBSTREET" as JobSource },
  { host: "jobstreet.com", source: "JOBSTREET" as JobSource },
]

const bodySchema = z.object({ url: z.string().url() })

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success || !parsed.data.url) {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 })
  }

  const url = parsed.data.url
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 })
  }

  const match = ALLOWED.find(
    (a) => host === a.host || host.endsWith(`.${a.host}`),
  )
  if (!match) {
    return NextResponse.json(
      { error: "Domain tidak didukung (hanya Glints & Jobstreet)" },
      { status: 400 },
    )
  }

  try {
    await assertPublicHostname(host)
  } catch {
    return NextResponse.json({ error: "Host tidak diizinkan" }, { status: 400 })
  }

  const rendered = await fetchRenderedHtml(url)
  const html = rendered.html
  const fetchError: string | null = rendered.error

  const fields =
    match.source === "GLINTS" ? parseGlints(html) : parseJobstreet(html)

  return NextResponse.json({
    source: match.source,
    sourceUrl: url,
    fetchError,
    ...fields,
  })
})
