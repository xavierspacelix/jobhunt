import { prisma } from "@/lib/db"
import { Prisma, type Job, type Profile } from "@/lib/generated/prisma/client"
import { assertPublicHostname } from "@/lib/ssrf"
import { fetchRenderedHtml, type RenderResult } from "@/lib/scrapers/render"
import { parseGlints } from "@/lib/scrapers/glints"
import { parseJobstreet } from "@/lib/scrapers/jobstreet"
import {
  buildSearchUrls,
  extractJobLinks,
  SEARCH_HOSTS,
} from "@/lib/scrapers/search"
import { llmMatch } from "@/lib/match"
import type { MatchResult } from "@/lib/match"
import type { JobSource, ParsedFields } from "@/lib/scrapers/types"
import { parseTrustedJobPayload } from "@/lib/job-data"

export const BATCH_LIMIT = 30
export const HIGH_SCORE_THRESHOLD = 70
export const SEARCH_PAGES = 2
const MIN_INTERVAL_MS = 1500
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 5000
const SEARCH_MATCH_TIMEOUT_MS = 25_000
export const MAX_AGE_DAYS = 30

export type ScrapedJob = NonNullable<ReturnType<typeof toJobData>>

export type MatchPreview = {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  source: "ai"
  profileRevision: string
}

export type SearchEvent =
  | { type: "start" }
  | { type: "search"; source: JobSource; message: string }
  | {
      type: "links"
      source: JobSource
      count: number
      failed?: boolean
      message: string
    }
  | { type: "detail"; current: number; total: number; message: string }
  | { type: "result"; job: ScrapedJob; match: MatchPreview }
  | {
      type: "done"
      collected: number
      details: number
      inspected: number
      results: number
      filtered?: number
      blocked?: number
      aiFailures?: number
      searchFailures?: number
      searchPages: number
      invalid?: number
      message: string
    }
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

type DoneEvent = Extract<SearchEvent, { type: "done" }>

export function searchRunHasFailed(event: DoneEvent): boolean {
  const allAiFailed =
    event.inspected > 0 && event.aiFailures === event.inspected
  const allDetailsFailed = event.details > 0 && event.blocked === event.details
  const allSearchPagesFailed =
    event.searchPages > 0 && event.searchFailures === event.searchPages
  const allQualifiedInvalid = event.results === 0 && (event.invalid ?? 0) > 0
  return (
    allAiFailed ||
    allDetailsFailed ||
    allSearchPagesFailed ||
    allQualifiedInvalid
  )
}

export function searchRunHasWarnings(event: DoneEvent): boolean {
  return (
    searchRunHasFailed(event) ||
    (event.aiFailures ?? 0) > 0 ||
    (event.blocked ?? 0) > 0 ||
    (event.searchFailures ?? 0) > 0 ||
    (event.invalid ?? 0) > 0
  )
}

export function selectBalancedTargets(
  collected: Record<JobSource, string[]>,
  limit = BATCH_LIMIT,
): string[] {
  const selected: string[] = []
  const seen = new Set<string>()
  const perSource = Math.floor(limit / 2)

  for (const source of ["GLINTS", "JOBSTREET"] as const) {
    for (const url of collected[source].slice(0, perSource)) {
      if (!seen.has(url)) {
        seen.add(url)
        selected.push(url)
      }
    }
  }

  for (const source of ["GLINTS", "JOBSTREET"] as const) {
    for (const url of collected[source].slice(perSource)) {
      if (selected.length >= limit) return selected
      if (!seen.has(url)) {
        seen.add(url)
        selected.push(url)
      }
    }
  }
  return selected
}

export async function runJobSearch(
  userId: string,
  keywords: string[],
  opts: SearchOptions = {},
  onProgress?: (e: SearchEvent) => void,
): Promise<{ collected: number; results: number; filtered: number }> {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  const sources: JobSource[] = ["GLINTS", "JOBSTREET"]
  const collected: Record<JobSource, Set<string>> = {
    GLINTS: new Set<string>(),
    JOBSTREET: new Set<string>(),
  }
  let searchFailures = 0
  let searchPages = 0

  for (const source of sources) {
    onProgress?.({
      type: "search",
      source,
      message: `Mencari di ${sourceLabel(source)}…`,
    })
    const searchUrls = buildSearchUrls(
      keywords,
      source,
      opts.location ?? undefined,
      5,
      SEARCH_PAGES,
    )
    for (const su of searchUrls) {
      searchPages++
      const res = await fetchWithBackoff(su)
      if (res?.html) {
        const links = extractJobLinks(res.html, source, su)
        links.forEach((l) => collected[source].add(l))
        onProgress?.({
          type: "links",
          source,
          count: links.length,
          message: `${links.length} lowongan ditemukan di ${sourceLabel(source)}`,
        })
      } else {
        searchFailures++
        onProgress?.({
          type: "links",
          source,
          count: 0,
          failed: true,
          message: `Gagal mengambil halaman hasil dari ${sourceLabel(source)}`,
        })
      }
      await sleep(MIN_INTERVAL_MS)
    }
  }

  const targets = selectBalancedTargets({
    GLINTS: [...collected.GLINTS],
    JOBSTREET: [...collected.JOBSTREET],
  })
  let filtered = 0
  let blocked = 0
  const candidates: ScrapedJob[] = []
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
    let data: ScrapedJob | null = null
    try {
      data = await scrapeJobDetail(url)
    } catch {
      blocked++
      await sleep(MIN_INTERVAL_MS)
      continue
    }
    if (data) {
      if (onlyOpen && data.closed) {
        filtered++
      } else if (
        data.postedAt &&
        Date.now() - data.postedAt.getTime() > maxAgeDays * 86400000
      ) {
        filtered++
      } else if (
        opts.location &&
        !locationMatches(opts.location, data.location)
      ) {
        filtered++
      } else {
        candidates.push(data)
      }
    } else {
      blocked++
    }
    await sleep(MIN_INTERVAL_MS)
  }

  // Score every candidate with AI only. Per-job failures are omitted so one
  // provider error does not discard successful recommendations.
  let results = 0
  let aiFailures = 0
  let invalid = 0
  if (candidates.length > 0) {
    onProgress?.({
      type: "search",
      source: "GLINTS",
      message: profile
        ? "Menilai kecocokan tiap lowongan dengan AI…"
        : "Menyiapkan hasil…",
    })
    const scored = await scoreCandidates(profile as Profile | null, candidates)
    for (const { job, match } of scored.matches) {
      if (!parseTrustedJobPayload(job).success) {
        invalid++
        continue
      }
      results++
      onProgress?.({ type: "result", job, match })
    }
    aiFailures = scored.failures
  }

  const filteredNote = filtered
    ? `, ${filtered} difilter (lokasi/tanggal/tutup)`
    : ""
  const blockedNote = blocked ? `, ${blocked} diblokir bot protection` : ""
  const aiFailureNote = aiFailures ? `, ${aiFailures} gagal dinilai AI` : ""
  const searchFailureNote = searchFailures
    ? `, ${searchFailures} halaman pencarian gagal diambil`
    : ""
  const invalidNote = invalid ? `, ${invalid} hasil tidak valid diabaikan` : ""
  const collectedCount = collected.GLINTS.size + collected.JOBSTREET.size
  onProgress?.({
    type: "done",
    collected: collectedCount,
    details: targets.length,
    inspected: candidates.length,
    results,
    filtered,
    blocked,
    aiFailures,
    searchFailures,
    searchPages,
    invalid,
    message: `Selesai — ${results} lowongan dengan skor minimal ${HIGH_SCORE_THRESHOLD}${filteredNote}${blockedNote}${aiFailureNote}${searchFailureNote}${invalidNote}. Pilih yang ingin disimpan.`,
  })
  return { collected: collectedCount, results, filtered }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return out
}

export function rankQualifiedMatches<T extends { match: MatchPreview }>(
  matches: T[],
  threshold = HIGH_SCORE_THRESHOLD,
): T[] {
  return matches
    .filter((result) => result.match.score >= threshold)
    .sort((a, b) => b.match.score - a.match.score)
}

async function scoreCandidates(
  profile: Profile | null,
  candidates: ScrapedJob[],
): Promise<{
  matches: { job: ScrapedJob; match: MatchPreview }[]
  failures: number
}> {
  if (!profile) return { matches: [], failures: candidates.length }
  const scored = await mapWithConcurrency(candidates, 4, async (job) => {
    try {
      const m: MatchResult = await llmMatch(profile, job as unknown as Job, {
        timeoutMs: SEARCH_MATCH_TIMEOUT_MS,
      })
      return {
        job,
        match: {
          score: m.score,
          matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills,
          source: "ai" as const,
          profileRevision: profile.updatedAt.toISOString(),
        },
      }
    } catch {
      return null
    }
  })
  const successful = scored.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  )
  return {
    matches: rankQualifiedMatches(successful),
    failures: scored.length - successful.length,
  }
}
