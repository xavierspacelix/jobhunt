import * as cheerio from "cheerio"
import type { Cheerio, CheerioAPI } from "cheerio"
import type { Element } from "domhandler"
import { parseJobHtml, htmlToText } from "./shared"
import type { ParsedFields } from "./types"

function blank(s?: string | null): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  return t || undefined
}

function smallestContaining(
  $: CheerioAPI,
  root: Cheerio<Element>,
  needles: string[],
): Cheerio<Element> | null {
  let best: Cheerio<Element> | null = null
  let bestLen = Infinity
  const all = root.add(root.find("*"))
  all.each((_i, el) => {
    const t = $(el).text()
    if (needles.some((n) => t.includes(n)) && t.length < bestLen) {
      bestLen = t.length
      best = $(el)
    }
  })
  return best
}

function extractGlintsIds(rawUrl?: string): {
  jobId?: string
  share?: string
} {
  if (!rawUrl) return {}
  const m = rawUrl.match(/opportunities\/jobs\/([^/]+)\/share\/([^/]+)/)
  if (m) return { jobId: m[1], share: m[2] }
  return {}
}

export function parseGlints(html: string, rawUrl?: string): ParsedFields {
  const base = parseJobHtml(html) as ParsedFields
  const $ = cheerio.load(html)
  const main = $("main").length ? $("main") : $("article")
  const root = main.length ? main : ($("body") as Cheerio<Element>)

  const dom: ParsedFields = {}

  const title = blank(root.find("h1").first().text())
  if (title) dom.title = title

  let companyLink = root.find('h1 + a[href*="/companies/"]')
  if (!companyLink.length) companyLink = root.find('a[href*="/companies/"]')
  const company = blank(companyLink.text())
  if (company) dom.company = company
  const companyUrl = blank(companyLink.attr("href"))
  if (companyUrl) {
    const m = companyUrl.match(/companies\/[^/]+\/([^/?#]+)/)
    if (m) dom.companyRefId = m[1]
  }

  const crumbs = $('nav[aria-label="Breadcrumb"] a')
  const location = blank(crumbs.last().text())
  if (location) dom.location = location
  if (crumbs.length >= 2) {
    const category = blank(crumbs.eq(crumbs.length - 2).text())
    if (category) dom.category = category
  }

  const salaryEl = smallestContaining($, root, ["Rp"])
  const salary = salaryEl ? blank(salaryEl.text()) : undefined
  if (salary) dom.salary = salary

  const typeEl = smallestContaining($, root, [
    "Freelance",
    "Kontrak",
    "Full time",
    "Part time",
    "Magang",
    "Internship",
  ])
  const jobType = typeEl ? blank(typeEl.text()) : undefined
  if (jobType) dom.employmentType = jobType

  const expEl = smallestContaining($, root, ["tahun pengalaman", "pengalaman"])
  const experience = expEl ? blank(expEl.text()) : undefined
  if (experience) dom.experience = experience

  const eduEl = smallestContaining($, root, [
    "Diploma",
    "Sarjana",
    "SMA",
    "SMK",
    "Pendidikan",
  ])
  const education = eduEl ? blank(eduEl.text()) : undefined
  if (education) dom.education = education

  const skillsHeading = root
    .find("h2, h3, h4")
    .filter((_i, el) => /skill/i.test($(el).text()))
  if (skillsHeading.length) {
    const skills = skillsHeading
      .first()
      .next()
      .children("div, span, p, a")
      .map((_i, el) => blank($(el).text()))
      .get()
      .filter(Boolean) as string[]
    if (skills.length) dom.skills = skills
  }

  const recruiterEl = smallestContaining($, root, ["Loker ini dikelola oleh"])
  if (recruiterEl) {
    const recruiter = blank(
      recruiterEl.text().replace("Loker ini dikelola oleh", ""),
    )
    if (recruiter) dom.recruiter = recruiter
  }

  const descHeading = root
    .find("h2, h3, h4")
    .filter((_i, el) => $(el).text().includes("Deskripsi pekerjaan"))
  if (descHeading.length) {
    const parts: string[] = []
    descHeading.first().nextAll().each((_i, el) => {
      if ($(el).is("h2, h3, h4")) return false
      const h = $(el).html()
      if (h) parts.push(htmlToText(h) ?? "")
    })
    const desc = parts.filter(Boolean).join("\n\n")
    if (desc) dom.description = desc
  }

  const compHeading = root
    .find("h2, h3, h4")
    .filter((_i, el) => $(el).text().includes("Tentang Perusahaan"))
  if (compHeading.length) {
    const cd = dom.companyDetails ?? {}
    const sec = compHeading.first().nextAll()
    const sizeEl = smallestContaining($, sec, ["karyawan"])
    const size = sizeEl ? blank(sizeEl.text()) : undefined
    if (size) cd.size = size

    const extLinks = sec
      .add(sec.find("*"))
      .filter('a[href^="http"]')
      .map((_i, el) => $(el).attr("href"))
      .get()
      .filter(Boolean) as string[]
    let website: string | undefined
    for (const href of extLinks) {
      if (/linkedin\.com/.test(href)) cd.linkedin = href
      else if (/instagram\.com/.test(href)) cd.instagram = href
      else if (/twitter\.com/.test(href)) cd.twitter = href
      else if (/facebook\.com/.test(href)) cd.facebook = href
      else if (!website) website = href
    }
    if (website) cd.website = website

    const aboutParts: string[] = []
    sec.each((_i, el) => {
      if ($(el).is("h2, h3, h4")) return false
      const h = $(el).html()
      if (h) aboutParts.push(htmlToText(h) ?? "")
    })
    const about = aboutParts.filter(Boolean).join("\n\n")
    if (about) cd.about = about
    dom.companyDetails = cd
  }

  const addrHeading = root
    .find("h2, h3, h4")
    .filter((_i, el) => $(el).text().includes("Alamat kantor"))
  if (addrHeading.length) {
    const addr = blank(addrHeading.first().next().text())
    if (addr)
      dom.companyDetails = { ...(dom.companyDetails ?? {}), address: addr }
  }

  const result: ParsedFields = { ...base }
  if (dom.title) result.title = dom.title
  if (dom.company) result.company = dom.company
  if (dom.location) result.location = dom.location
  if (dom.category) result.category = dom.category
  if (dom.salary) result.salary = dom.salary
  if (dom.employmentType) result.employmentType = dom.employmentType
  if (dom.experience) result.experience = dom.experience
  if (dom.education) result.education = dom.education
  if (dom.skills?.length) result.skills = dom.skills
  if (dom.recruiter) result.recruiter = dom.recruiter
  if (dom.description) result.description = dom.description
  if (dom.companyRefId) result.companyRefId = dom.companyRefId
  if (dom.companyDetails && Object.keys(dom.companyDetails).length) {
    result.companyDetails = {
      ...(result.companyDetails ?? {}),
      ...dom.companyDetails,
    }
  }

  const { jobId, share } = extractGlintsIds(rawUrl)
  if (jobId) result.externalJobId = jobId
  if (share) result.shareToken = share

  return result
}
