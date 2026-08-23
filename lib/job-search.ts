import { prisma } from "@/lib/db"
import { Prisma, type Job, type Profile } from "@/lib/generated/prisma/client"
import { assertPublicHostname } from "@/lib/ssrf"
import { fetchRenderedHtml, type RenderResult } from "@/lib/scrapers/render"
import { parseGlints } from "@/lib/scrapers/glints"
import { parseJobstreet } from "@/lib/scrapers/jobstreet"
import { buildSearchUrls, extractJobLinks, SEARCH_HOSTS } from "@/lib/scrapers/search"
import { heuristicMatch } from "@/lib/match"
import type { JobSource, ParsedFields } from "@/lib/scrapers/types"

export const BATCH_LIMIT = 20
const MIN_INTERVAL_MS = 1500
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 5000
export const MAX_AGE_DAYS = 30

export type ScrapedJob = NonNullable<ReturnType<typeof toJobData>>

export type MatchPreview = {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  source: "ai" | "heuristic"
}

export type SearchEvent =
  | { type: "start" }
  | { type: "search"; source: JobSource; message: string }
  | { type: "links"; source: JobSource; count: number; message: string }
  | { type: "detail"; current: number; total: number; message: string }
  | { type: "result"; job: ScrapedJob; match: MatchPreview }
  | { type: "done"; collected: number; results: number; filtered?: number; message: string }
  | { type: "error"; message: string }

function sourceLabel(source: JobSource): string {
  return source === "GLINTS" ? "Glints" : "Jobstreet"
}

export function parseKeywords(input: unknown): string[] {
  const raw: string[] = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,\n]/)
      : []
  return raw
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10)
}

interface KeywordSource {
  skills?: string[] | null
  headline?: string | null
  experience?: unknown
}

const STOPWORDS = /^(senior|junior|staff|lead|the|a|an|di|dan|and|of|pt|cv)$/i

// Derive search keywords from the WHOLE profile (skills + headline + experience
// roles), not just skills — so the scrape/AI goal isn't skills-only.
export function profileKeywords(profile: KeywordSource | null): string[] {
  const out = new Set<string>()
  for (const s of profile?.skills ?? []) {
    if (s?.trim()) out.add(s.trim())
  }
  if (profile?.headline) {
    const words = profile.headline.split(/[\s,/()]+/)
    for (const w of words) {
      const t = w.trim()
      if (t.length >= 3 && !STOPWORDS.test(t)) out.add(t)
    }
  }
  if (Array.isArray(profile?.experience)) {
    for (const e of profile.experience as Array<{ role?: string }>) {
      if (e?.role?.trim()) out.add(e.role.trim())
    }
  }
  return [...out].slice(0, 10)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithBackoff(
  url: string,
  retries = MAX_RETRIES,
): Promise<RenderResult | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetchRenderedHtml(url)
    if (!res.error || !/429/.test(res.error)) return res
    if (attempt === retries) return res
    const wait = BASE_BACKOFF_MS * 2 ** attempt
    console.warn(
      `[search] 429 on ${url}, backoff ${wait}ms (attempt ${attempt + 1})`,
    )
    await sleep(wait)
  }
  return null
}

export function toJobData(
  fields: ParsedFields,
  source: JobSource,
  sourceUrl: string,
) {
  const title = fields.title?.trim()
  if (!title) return null
  const postedAt = fields.postedAt ? new Date(fields.postedAt) : null
  const validPosted =
    postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null
  return {
    title,
    company: fields.company?.trim() || "",
    location: fields.location?.trim() || null,
    salary: fields.salary?.trim() || null,
    source,
    sourceUrl,
    description: fields.description?.trim() || null,
    postedAt: validPosted,
    employmentType: fields.employmentType?.trim() || null,
    experience: fields.experience?.trim() || null,
    education: fields.education?.trim() || null,
    category: fields.category?.trim() || null,
    recruiter: fields.recruiter?.trim() || null,
    skills: fields.skills && fields.skills.length ? fields.skills : [],
    externalJobId: fields.externalJobId?.trim() || null,
    shareToken: fields.shareToken?.trim() || null,
    companyRefId: fields.companyRefId?.trim() || null,
    companyDetails: fields.companyDetails as Prisma.InputJsonValue | undefined,
    closed: Boolean(fields.closed),
  }
}

async function scrapeJobDetail(url: string): Promise<ScrapedJob | null> {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  try {
    await assertPublicHostname(host)
  } catch {
    return null
  }

  const source: JobSource = SEARCH_HOSTS.GLINTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  )
    ? "GLINTS"
    : "JOBSTREET"

  const res = await fetchWithBackoff(url)
  if (!res || !res.html) return null

  const fields =
    source === "GLINTS"
      ? parseGlints(res.html, url)
      : parseJobstreet(res.html, url)
  return toJobData(fields, source, url)
}

function normalizeLocation(s?: string | null): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/^(kota|kabupaten|provinsi|daerah khusus ibukota)\s+/i, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Best-effort match between a user-selected location and a parsed job location.
// Empty selection = no filter. "remote" only matches jobs that are remote.
export function locationMatches(
  selected: string | null | undefined,
  parsed?: string | null,
): boolean {
  const sel = normalizeLocation(selected)
  if (!sel) return true
  const hay = normalizeLocation(parsed)
  if (!hay) return false
  if (sel === "remote") return hay.includes("remote")
  if (hay.includes("remote")) return false
  const selTokens = sel.split(" ").filter((t) => t.length >= 3)
  if (selTokens.some((t) => hay.includes(t))) return true
  const hayTokens = hay.split(" ").filter((t) => t.length >= 3)
  if (hayTokens.some((t) => sel.includes(t))) return true
  return hay.includes(sel) || sel.includes(hay)
}

export interface SearchOptions {
  location?: string | null
  maxAgeDays?: number
  onlyOpen?: boolean
}

export async function runJobSearch(
  userId: string,
  keywords: string[],
  opts: SearchOptions = {},
  onProgress?: (e: SearchEvent) => void,
): Promise<{ collected: number; results: number; filtered: number }> {
  const profile = await prisma.profile
    .findUnique({ where: { userId } })
    .catch(() => null)
  const sources: JobSource[] = ["GLINTS", "JOBSTREET"]
  const collected = new Set<string>()

  for (const source of sources) {
    onProgress?.({
      type: "search",
      source,
      message: `Mencari di ${sourceLabel(source)}…`,
    })
    const searchUrls = buildSearchUrls(keywords, source, opts.location ?? undefined)
    for (const su of searchUrls) {
      const res = await fetchWithBackoff(su)
      if (res?.html) {
        const links = extractJobLinks(res.html, source, su)
        links.forEach((l) => collected.add(l))
        onProgress?.({
          type: "links",
          source,
          count: links.length,
          message: `${links.length} lowongan ditemukan di ${sourceLabel(source)}`,
        })
      } else {
        onProgress?.({
          type: "links",
          source,
          count: 0,
          message: `Tidak ada hasil dari ${sourceLabel(source)}`,
        })
      }
      await sleep(MIN_INTERVAL_MS)
    }
  }

  const targets = [...collected].slice(0, BATCH_LIMIT)
  let results = 0
  let filtered = 0
  let current = 0
  const maxAgeDays = opts.maxAgeDays ?? MAX_AGE_DAYS
  const onlyOpen = opts.onlyOpen !== false
  for (const url of targets) {
    current++
    onProgress?.({
      type: "detail",
      current,
      total: targets.length,
      message: `Mengambil detail ${current}/${targets.length}`,
    })
    const data = await scrapeJobDetail(url)
    if (data) {
      if (onlyOpen && data.closed) {
        filtered++
      } else if (data.postedAt && Date.now() - data.postedAt.getTime() > maxAgeDays * 86400000) {
        filtered++
      } else if (opts.location && !locationMatches(opts.location, data.location)) {
        filtered++
      } else {
        const match: MatchPreview = profile
          ? heuristicMatch(profile as Profile, data as unknown as Job)
          : { score: 0, matchedSkills: [], missingSkills: [], source: "heuristic" }
        results++
        onProgress?.({ type: "result", job: data, match })
      }
    }
    await sleep(MIN_INTERVAL_MS)
  }

  const filteredNote = filtered ? `, ${filtered} difilter (lokasi/tanggal/tutup)` : ""
  onProgress?.({
    type: "done",
    collected: collected.size,
    results,
    filtered,
    message: `Selesai — ${results} lowongan ditemukan${filteredNote}. Pilih yang ingin disimpan.`,
  })
  return { collected: collected.size, results, filtered }
}
