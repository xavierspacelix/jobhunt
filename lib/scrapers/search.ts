import type { JobSource } from "./types"

export const SEARCH_HOSTS: Record<JobSource, string[]> = {
  GLINTS: ["glints.com"],
  JOBSTREET: ["jobstreet.co.id", "jobstreet.com"],
}

function hostFor(source: JobSource): string {
  return source === "GLINTS" ? "glints.com" : "jobstreet.co.id"
}

export function buildSearchUrls(
  skills: string[],
  source: JobSource,
  limit = 5,
): string[] {
  const terms = (skills ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, limit)
  if (terms.length === 0) return []
  const host = hostFor(source)
  if (source === "GLINTS") {
    return terms.map(
      (t) =>
        `https://${host}/id/opportunities/jobs/explore?keyword=${encodeURIComponent(
          t,
        )}&country=ID`,
    )
  }
  return terms.map(
    (t) =>
      `https://www.${host}/en/job-search?key=${encodeURIComponent(t)}`,
  )
}

export function isJobDetailUrl(url: string, source: JobSource): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  const host = u.hostname.toLowerCase()
  const path = u.pathname.toLowerCase()
  const okHost = SEARCH_HOSTS[source].some(
    (h) => host === h || host.endsWith(`.${h}`),
  )
  if (!okHost) return false
  if (source === "GLINTS") return /\/(?:opportunities\/jobs|job)\//.test(path)
  return /\/job\//.test(path) || /\/joblisting\//.test(path)
}

export function extractJobLinks(
  html: string,
  source: JobSource,
  baseUrl: string,
): string[] {
  const hrefs = [
    ...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi),
  ].map((m) => m[1])
  const out = new Set<string>()
  for (const raw of hrefs) {
    let abs: string
    try {
      abs = new URL(raw, baseUrl).toString()
    } catch {
      continue
    }
    if (isJobDetailUrl(abs, source)) out.add(abs)
  }
  return [...out]
}
