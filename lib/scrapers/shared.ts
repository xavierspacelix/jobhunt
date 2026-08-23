import * as cheerio from "cheerio"
import type { CheerioAPI } from "cheerio"
import type { ParsedFields, CompanyDetails } from "./types"

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

function asText(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  if (Array.isArray(v)) {
    const parts = v.map((x) => str(x)).filter(Boolean)
    return parts.length ? parts.join(" · ") : undefined
  }
  return str(v)
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean) as string[]
  const s = str(v)
  if (!s) return []
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean)
  if (s.includes("\n")) return s.split("\n").map((x) => x.trim()).filter(Boolean)
  return [s]
}

export function htmlToText(html?: string): string | undefined {
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

function extractIdentifier(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === "string") return str(v)
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    return str(o["value"]) ?? str(o["name"]) ?? str(o["@id"])
  }
  return undefined
}

function classifyUrls(urls: string[]): {
  website?: string
  linkedin?: string
  instagram?: string
  twitter?: string
  facebook?: string
} {
  const out: {
    website?: string
    linkedin?: string
    instagram?: string
    twitter?: string
    facebook?: string
  } = {}
  for (const raw of urls) {
    const u = str(raw)
    if (!u) continue
    const lu = u.toLowerCase()
    if (lu.includes("linkedin.com")) out.linkedin ||= u
    else if (lu.includes("instagram.com")) out.instagram ||= u
    else if (lu.includes("twitter.com") || lu.includes("x.com")) out.twitter ||= u
    else if (lu.includes("facebook.com")) out.facebook ||= u
    else if (!out.website) out.website = u
  }
  return out
}

function orgToDetails(org: unknown): CompanyDetails | undefined {
  if (!org || typeof org !== "object") return undefined
  const o = org as Record<string, unknown>
  const sameAs = asArray(o["sameAs"])
  const website = str(o["url"])
  const urls = website ? [website, ...sameAs] : sameAs
  const social = classifyUrls(urls)

  let size: string | undefined
  const ne = o["numberOfEmployees"] ?? o["employeeRange"]
  if (ne) {
    if (typeof ne === "object") {
      const n = ne as Record<string, unknown>
      const min = num(n["minValue"])
      const max = num(n["maxValue"])
      const val = num(n["value"])
      const unit = str(n["unitText"])
      if (min !== undefined && max !== undefined)
        size = `${min} - ${max}${unit ? ` ${unit}` : ""}`
      else if (val !== undefined) size = String(val)
    } else {
      size = str(ne)
    }
  }

  let address: string | undefined
  const addr = o["address"] as Record<string, unknown> | undefined
  if (addr) {
    const parts = [
      str(addr["streetAddress"]),
      str(addr["addressLocality"]),
      str(addr["addressRegion"]),
      str(addr["addressCountry"]),
    ].filter(Boolean)
    address = parts.join(", ") || undefined
  }

  const details: CompanyDetails = {
    name: str(o["name"]),
    industry: asText(o["industry"]),
    size,
    website: social.website ?? website,
    linkedin: social.linkedin,
    instagram: social.instagram,
    twitter: social.twitter,
    facebook: social.facebook,
    address,
    about: htmlToText(str(o["description"])),
  }
  return details
}

function recursiveFindKey(
  node: unknown,
  keys: string[],
  depth = 0,
): unknown {
  if (depth > 6 || !node || typeof node !== "object") return undefined
  const obj = node as Record<string, unknown>
  for (const k of keys) {
    if (k in obj && obj[k] != null) return obj[k]
  }
  for (const k of Object.keys(obj)) {
    const child = obj[k]
    if (Array.isArray(child)) {
      for (const c of child) {
        const found = recursiveFindKey(c, keys, depth + 1)
        if (found != null) return found
      }
    } else if (child && typeof child === "object") {
      const found = recursiveFindKey(child, keys, depth + 1)
      if (found != null) return found
    }
  }
  return undefined
}

export function ldToFields(ld: Record<string, unknown>): ParsedFields {
  const title = str(ld["title"])

  const hiring = (
    Array.isArray(ld["hiringOrganization"])
      ? (ld["hiringOrganization"] as unknown[])[0]
      : ld["hiringOrganization"]
  ) as Record<string, unknown> | undefined
  const company = hiring ? str(hiring["name"]) : undefined
  const companyDetails = hiring ? orgToDetails(hiring) : undefined

  let location: string | undefined
  const loc = (
    Array.isArray(ld["jobLocation"])
      ? (ld["jobLocation"] as unknown[])[0]
      : ld["jobLocation"]
  ) as Record<string, unknown> | undefined
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

  const employmentType = asText(ld["employmentType"])
  const experience = asText(ld["experienceRequirements"])
  const education = asText(ld["educationRequirements"])
  const category =
    asText(ld["occupationalCategory"]) ?? asText(ld["industry"])
  const skills = asArray(ld["skills"])
  const externalJobId = extractIdentifier(ld["identifier"])
  const shareToken = asText(
    recursiveFindKey(ld, ["shareToken", "share_token", "shareId", "shareKey"]),
  )
  const companyRefId = asText(
    recursiveFindKey(ld, ["companyId", "company_id", "organizationId"]),
  )
  const recruiter = asText(
    recursiveFindKey(ld, ["recruiter", "hiringManager", "contactPoint"]),
  )

  return {
    title,
    company,
    companyRefId,
    location,
    salary,
    description,
    postedAt,
    employmentType,
    experience,
    education,
    category,
    recruiter,
    skills: skills.length ? skills : undefined,
    externalJobId,
    shareToken,
    companyDetails,
  }
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

function extractExperienceFromText(text: string): string | undefined {
  if (!text) return undefined
  const m = text.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:tahun|year|yr)/i)
  if (m) return `${m[1]} - ${m[2]} tahun`
  const s = text.match(/(\d+)\s*(?:tahun|year|yr)/i)
  if (s) return `${s[1]} tahun`
  return undefined
}

export function cleanEmpty(fields: ParsedFields): ParsedFields {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(fields) as (keyof ParsedFields)[]) {
    const value = fields[key]
    if (value === undefined || value === null) continue
    if (typeof value === "string") {
      if (value.trim() !== "") out[key] = value
    } else if (Array.isArray(value)) {
      if (value.length) out[key] = value
    } else if (typeof value === "object") {
      const cd = value as CompanyDetails
      const has = Object.values(cd).some((v) => v && v.trim() !== "")
      if (has) out[key] = value
    }
  }
  return out as ParsedFields
}

const CLOSED_PATTERNS = [
  /sudah ditutup/i,
  /telah ditutup/i,
  /pendaftaran ditutup/i,
  /lowongan (ini |tersebut )?ditutup/i,
  /lamaran ditutup/i,
  /pendaftaran telah ditutup/i,
  /lowongan tidak ( lagi )?tersedia/i,
  /no longer accepting/i,
  /\bexpired\b/i,
  /posisi (sudah )?penuh/i,
  /kuota (sudah )?penuh/i,
]

export function isClosedFromText(text: string): boolean {
  const t = text.toLowerCase()
  return CLOSED_PATTERNS.some((re) => re.test(t))
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

  if (!fields.experience && fields.description) {
    const exp = extractExperienceFromText(fields.description)
    if (exp) fields.experience = exp
  }

  const pageText = $("body").text()
  if (isClosedFromText(pageText)) fields.closed = true

  return cleanEmpty(fields)
}
