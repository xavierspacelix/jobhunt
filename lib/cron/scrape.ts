import { prisma } from "@/lib/db"
import { Prisma } from "@/lib/generated/prisma/client"
import { assertPublicHostname } from "@/lib/ssrf"
import { fetchRenderedHtml, type RenderResult } from "@/lib/scrapers/render"
import { parseGlints } from "@/lib/scrapers/glints"
import { parseJobstreet } from "@/lib/scrapers/jobstreet"
import { buildSearchUrls, extractJobLinks, SEARCH_HOSTS } from "@/lib/scrapers/search"
import type { JobSource, ParsedFields } from "@/lib/scrapers/types"

export const BATCH_LIMIT = 20
const MIN_INTERVAL_MS = 1500
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 5000

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
      `[cron] 429 on ${url}, backoff ${wait}ms (attempt ${attempt + 1})`,
    )
    await sleep(wait)
  }
  return null
}

function toJobData(
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
  }
}

async function scrapeJobDetail(
  userId: string,
  url: string,
): Promise<boolean> {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return false
  }
  try {
    await assertPublicHostname(host)
  } catch {
    return false
  }

  const source: JobSource = SEARCH_HOSTS.GLINTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  )
    ? "GLINTS"
    : "JOBSTREET"

  const res = await fetchWithBackoff(url)
  if (!res || !res.html) return false

  const fields =
    source === "GLINTS"
      ? parseGlints(res.html, url)
      : parseJobstreet(res.html, url)
  const data = toJobData(fields, source, url)
  if (!data) return false

  try {
    const job = await prisma.job.upsert({
      where: { sourceUrl: url },
      update: data,
      create: data,
    })
    await prisma.recommendation.upsert({
      where: { userId_jobId: { userId, jobId: job.id } },
      update: {},
      create: { userId, jobId: job.id },
    })
    return true
  } catch (e) {
    console.error(
      `[cron] gagal simpan ${url}:`,
      e instanceof Error ? e.message : e,
    )
    return false
  }
}

export async function scrapeUser(
  userId: string,
  skills: string[],
): Promise<{ collected: number; saved: number }> {
  const sources: JobSource[] = ["GLINTS", "JOBSTREET"]
  const collected = new Set<string>()

  for (const source of sources) {
    const searchUrls = buildSearchUrls(skills, source)
    for (const su of searchUrls) {
      const res = await fetchWithBackoff(su)
      if (res?.html) {
        for (const link of extractJobLinks(res.html, source, su)) {
          collected.add(link)
        }
      }
      await sleep(MIN_INTERVAL_MS)
    }
  }

  const targets = [...collected].slice(0, BATCH_LIMIT)
  let saved = 0
  for (const url of targets) {
    if (await scrapeJobDetail(userId, url)) saved++
    await sleep(MIN_INTERVAL_MS)
  }
  return { collected: collected.size, saved }
}

export async function runAllScrapes(): Promise<
  { email: string; collected: number; saved: number }[]
> {
  const users = await prisma.user.findMany({
    where: { profile: { isNot: null } },
    select: { id: true, email: true, profile: { select: { skills: true } } },
  })
  const active = users.filter((u) => (u.profile?.skills?.length ?? 0) > 0)
  const results = []
  for (const u of active) {
    const r = await scrapeUser(u.id, u.profile!.skills)
    console.log(
      `[cron] ${u.email}: collected ${r.collected}, saved ${r.saved}`,
    )
    results.push({ email: u.email, ...r })
  }
  return results
}
