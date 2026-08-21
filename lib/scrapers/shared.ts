import * as cheerio from "cheerio"
import type { CheerioAPI } from "cheerio"
import type { ParsedFields } from "./types"

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined
  if (typeof v === "number") return String(v)
  return undefined
}

function num(v: unknown): number | undefined {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function htmlToText(html?: string): string | undefined {
  if (!html) return undefined
  const text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(
      /<\/(p|div|li|tr|h[1-6]|ul|ol|section|article|blockquote)>/gi,
      "\n",
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || undefined
}

function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null
  const obj = node as Record<string, unknown>
  const type = obj["@type"]
  const types = Array.isArray(type)
    ? (type as unknown[])
    : typeof type === "string"
      ? [type]
      : []
  if (types.some((t) => String(t).toLowerCase() === "jobposting")) {
    return obj
  }
  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"] as unknown[]) {
      const found = findJobPosting(child)
      if (found) return found
    }
  }
  if (Array.isArray(obj["itemListElement"])) {
    for (const child of obj["itemListElement"] as unknown[]) {
      const found = findJobPosting(child)
      if (found) return found
    }
  }
  return null
}

function findSalaryNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null
  const obj = node as Record<string, unknown>
  if (obj["baseSalary"] || obj["salary"] || obj["estimatedSalary"]) return obj
  for (const key of Object.keys(obj)) {
    const child = obj[key]
    if (Array.isArray(child)) {
      for (const c of child) {
        const found = findSalaryNode(c)
        if (found) return found
      }
    } else if (child && typeof child === "object") {
      const found = findSalaryNode(child)
      if (found) return found
    }
  }
  return null
}

export function extractJobPostingLd($: CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]')
  for (const el of scripts.toArray()) {
    const text = $(el).contents().text()
    if (!text) continue
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      continue
    }
    const found = findJobPosting(data)
    if (found) return found
  }
  return null
}

export function extractSalaryLd($: CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]')
  for (const el of scripts.toArray()) {
    const text = $(el).contents().text()
    if (!text) continue
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      continue
    }
    const found = findSalaryNode(data)
    if (found) return found
  }
  return null
}

export function ldToFields(ld: Record<string, unknown>): ParsedFields {
  const title = str(ld["title"])

  const hiring = ld["hiringOrganization"] as Record<string, unknown> | undefined
  const company = hiring ? str(hiring["name"]) : undefined

  let location: string | undefined
  const loc = ld["jobLocation"] as Record<string, unknown> | undefined
  if (loc) {
    const addr = loc["address"] as Record<string, unknown> | undefined
    if (addr) {
      const parts = [
        str(addr["addressLocality"]),
        str(addr["addressRegion"]),
        str(addr["addressCountry"]),
      ].filter(Boolean)
      location = parts.join(", ") || undefined
    }
  }

  let salary: string | undefined
  const bs = (ld["baseSalary"] ??
    ld["salary"] ??
    ld["estimatedSalary"]) as Record<string, unknown> | undefined
  if (bs) {
    const value = bs["value"] as Record<string, unknown> | undefined
    const amount = value ? num(value["value"]) : num(bs["value"])
    const unit = value ? str(value["unitText"]) : str(bs["unitText"])
    if (amount !== undefined) {
      const currency = str(bs["currency"]) ?? ""
      const unitLabel = unit ? `/${unit}` : ""
      salary = `${currency} ${amount.toLocaleString("en-US")}${unitLabel}`.trim()
    }
  }

  const description = htmlToText(str(ld["description"]))
  const postedAt = str(ld["datePosted"])

  return { title, company, location, salary, description, postedAt }
}

export function metaFields($: CheerioAPI): ParsedFields {
  const title =
    str($('meta[property="og:title"]').attr("content")) ||
    str($("title").first().text())
  const description =
    str($('meta[property="og:description"]').attr("content")) ||
    str($('meta[name="description"]').attr("content"))
  const company = str($('meta[property="og:site_name"]').attr("content"))
  return { title, company, description }
}

const SALARY_EXPRESSIONS = [
  /Rp\.?\s*[\d][\d.,]*\s*(?:[-–]\s*Rp\.?\s*[\d][\d.,]*)?(?:\s*(?:k|K|jt|juta|ribu|rb))?\s*(?:(?:per\s+)?(?:bulan|minggu|hari|tahun|month|year|week|day|mo|yr|annually|monthly))?/i,
  /IDR\s*[\d][\d.,]*\s*(?:[-–]\s*IDR\s*)?(?:\s*(?:k|K|jt|juta|ribu|rb))?\s*(?:\/\s*(?:mo|month|year|day|week))?/i,
  /\$\s*[\d][\d.,]*\s*(?:[-–]\s*\$\s*[\d][\d.,]*)?/i,
  /[\d][\d.,]*\s*(?:juta|jt|ribu|rb)\b/i,
]

export function extractSalaryFromText(text: string): string | undefined {
  if (!text) return undefined
  const cleaned = text.replace(/\s+/g, " ")
  for (const re of SALARY_EXPRESSIONS) {
    const m = cleaned.match(re)
    if (m) return m[0].replace(/\s+/g, " ").trim()
  }
  return undefined
}

export function cleanEmpty(fields: ParsedFields): ParsedFields {
  const out: ParsedFields = {}
  for (const key of Object.keys(fields) as (keyof ParsedFields)[]) {
    const value = fields[key]
    if (value && value.trim() !== "") out[key] = value
  }
  return out
}

export function parseJobHtml(html: string): ParsedFields {
  const $ = cheerio.load(html)
  const ld = extractJobPostingLd($)
  const fields: ParsedFields = ld ? ldToFields(ld) : metaFields($)

  if (!fields.salary) {
    const salLd = extractSalaryLd($)
    if (salLd) {
      const sf = ldToFields(salLd)
      if (sf.salary) fields.salary = sf.salary
    }
  }
  if (!fields.salary) {
    const fromBody = extractSalaryFromText($("body").text())
    if (fromBody) fields.salary = fromBody
  }
  if (!fields.salary) {
    const desc =
      str($('meta[name="description"]').attr("content")) ||
      str($('meta[property="og:description"]').attr("content")) ||
      ""
    const fromDesc = extractSalaryFromText(desc)
    if (fromDesc) fields.salary = fromDesc
  }

  return cleanEmpty(fields)
}
