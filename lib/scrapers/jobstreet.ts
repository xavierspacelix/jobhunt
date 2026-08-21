import * as cheerio from "cheerio"
import { parseJobHtml, htmlToText } from "./shared"
import type { ParsedFields } from "./types"

function blank(s?: string | null): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  return t || undefined
}

function extractJobId(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined
  const m = rawUrl.match(/(\d{6,})/)
  return m ? m[1] : undefined
}

export function parseJobstreet(html: string, rawUrl?: string): ParsedFields {
  const base = parseJobHtml(html) as ParsedFields
  const $ = cheerio.load(html)
  const dom: ParsedFields = {}

  const title = blank($('h1[data-automation="job-detail-title"]').text())
  if (title) dom.title = title

  const company = blank($('[data-automation="job-detail-company"] a').text())
  if (company) dom.company = company

  const companyUrl = blank(
    $('[data-automation="job-detail-company"] a').attr("href"),
  )
  if (companyUrl) {
    dom.companyDetails = { website: companyUrl }
  }

  const location = blank($('[data-automation="job-detail-location"]').text())
  if (location) dom.location = location

  const industry = blank($('[data-automation="job-detail-industry"]').text())
  if (industry) dom.category = industry

  const jobType = blank($('[data-automation="job-detail-work-type"]').text())
  if (jobType) dom.employmentType = jobType

  const salaryRaw = blank($('[data-automation="job-detail-salary"]').text())
  if (salaryRaw && !/masuk ke akun/i.test(salaryRaw)) dom.salary = salaryRaw

  const dateRaw = blank($('[data-automation="job-detail-date"]').text())
  if (dateRaw) {
    const days = dateRaw.match(/(\d+)\s*hari/i)
    if (days) {
      const d = new Date()
      d.setDate(d.getDate() - Number(days[1]))
      dom.postedAt = d.toISOString()
    }
  }

  const descHtml = $('[data-automation="jobAdDetails"]').html()
  const qualHtml = $('[data-automation="jobAdDetails"]').next().html()
  const parts = [descHtml, qualHtml]
    .map((h) => (h ? htmlToText(h) : undefined))
    .filter(Boolean) as string[]
  if (parts.length) dom.description = parts.join("\n\n")

  const result: ParsedFields = { ...base }
  if (dom.title) result.title = dom.title
  if (dom.company) result.company = dom.company
  if (dom.location) result.location = dom.location
  if (dom.employmentType) result.employmentType = dom.employmentType
  if (dom.salary) result.salary = dom.salary
  if (dom.category) result.category = dom.category
  if (dom.postedAt) result.postedAt = dom.postedAt
  if (dom.description) result.description = dom.description
  if (dom.companyDetails?.website) {
    result.companyDetails = {
      ...(result.companyDetails ?? {}),
      website: dom.companyDetails.website,
    }
  }

  const jobId = extractJobId(rawUrl)
  if (jobId) result.externalJobId = jobId

  return cleanEmpty(result)
}

function cleanEmpty(f: ParsedFields): ParsedFields {
  const out: ParsedFields = { ...f }
  for (const k of Object.keys(out) as (keyof ParsedFields)[]) {
    const v = out[k]
    if (v === undefined || v === null || v === "") delete out[k]
    if (Array.isArray(v) && v.length === 0) delete out[k]
    if (
      k === "companyDetails" &&
      v &&
      typeof v === "object" &&
      Object.keys(v).length === 0
    ) {
      delete out[k]
    }
  }
  return out
}
