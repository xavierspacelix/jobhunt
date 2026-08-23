import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { assertPublicHostname } from "@/lib/ssrf"
import { fetchRenderedHtml } from "@/lib/scrapers/render"
import { parseGlints } from "@/lib/scrapers/glints"
import { parseJobstreet } from "@/lib/scrapers/jobstreet"
import { getSupportedJobSource, parseTrustedJobPayload } from "@/lib/job-data"
import { signJobPreview } from "@/lib/job-preview"
import { prisma } from "@/lib/db"
import { jobFetchRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const bodySchema = z.object({ url: z.string().url() })

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!jobFetchRateLimit(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak pengambilan lowongan, coba lagi nanti." },
      { status: 429 },
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success || !parsed.data.url) {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 })
  }

  const url = parsed.data.url
  let host: string
  try {
    const parsedUrl = new URL(url)
    host = parsedUrl.hostname.toLowerCase()
  } catch {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 })
  }

  const source = getSupportedJobSource(url)
  if (!source) {
    return NextResponse.json(
      { error: "Domain tidak didukung (hanya Glints & Jobstreet)" },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await assertPublicHostname(host)
  } catch {
    return NextResponse.json({ error: "Host tidak diizinkan" }, { status: 400 })
  }

  const rendered = await fetchRenderedHtml(url)
  const html = rendered.html
  if (!html) {
    return NextResponse.json(
      { error: rendered.error ?? "Halaman diblokir (bot protection / Cloudflare)" },
      { status: 422 },
    )
  }
  const fetchError: string | null = rendered.error

  const fields =
    source === "GLINTS"
      ? parseGlints(html, url)
      : parseJobstreet(html, url)

  const trusted = parseTrustedJobPayload({ source, sourceUrl: url, ...fields })
  if (!trusted.success) {
    return NextResponse.json(
      { error: "Detail lowongan tidak dapat diparsing" },
      { status: 422 },
    )
  }

  return NextResponse.json({
    fetchError,
    ...trusted.data,
    previewToken: signJobPreview(trusted.data, user.id),
  })
})
