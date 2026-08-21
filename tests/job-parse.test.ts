import { test } from "node:test"
import assert from "node:assert/strict"
import { parseGlints } from "../lib/scrapers/glints"
import { parseJobstreet } from "../lib/scrapers/jobstreet"

const GLINTS_HTML = `<!DOCTYPE html>
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Senior Frontend Engineer",
  "hiringOrganization": { "@type": "Organization", "name": "Tokopedia" },
  "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": "Jakarta", "addressRegion": "DKI Jakarta", "addressCountry": "ID" } },
  "baseSalary": { "@type": "MonetaryAmount", "currency": "IDR", "value": { "@type": "QuantitativeValue", "value": 15000000, "unitText": "MONTH" } },
  "datePosted": "2024-05-01",
  "description": "<p>We are hiring a <b>Senior Frontend Engineer</b> to build great UI.</p>"
}
</script>
</head><body></body></html>`

const JOBSTREET_HTML = `<!DOCTYPE html>
<html><head>
<meta property="og:title" content="Backend Developer - Gojek">
<meta property="og:description" content="Build scalable services.">
<meta property="og:site_name" content="Jobstreet">
<title>Backend Developer - Gojek | Jobstreet</title>
</head><body></body></html>`

const EMPTY_HTML = `<!DOCTYPE html><html><head></head><body><p>no data</p></body></html>`

const JOBSTREET_WITH_SALARY = `<!DOCTYPE html>
<html><head><title>x</title></head>
<body>
  <h1>Senior Backend Engineer</h1>
  <div>Gaji: Rp 10.000.000 - Rp 15.000.000 per bulan</div>
  <p>Some intro text here.</p>
</body></html>`

const DESC_HTML = `<!DOCTYPE html><html><head>
<script type="application/ld+json">
{ "@context": "https://schema.org/", "@type": "JobPosting", "title": "Dev",
  "description": "<p>First paragraph.</p><p>Second paragraph with <b>bold</b>.</p>" }
</script>
</head><body></body></html>`

test("parseGlints extracts JSON-LD JobPosting", () => {
  const f = parseGlints(GLINTS_HTML)
  assert.equal(f.title, "Senior Frontend Engineer")
  assert.equal(f.company, "Tokopedia")
  assert.equal(f.location, "Jakarta, DKI Jakarta, ID")
  assert.equal(f.salary, "IDR 15,000,000/MONTH")
  assert.equal(f.postedAt, "2024-05-01")
  assert.ok(f.description?.includes("Senior Frontend Engineer"))
  assert.ok(!f.description?.includes("<b>"))
})

test("parseJobstreet falls back to meta tags", () => {
  const f = parseJobstreet(JOBSTREET_HTML)
  assert.equal(f.title, "Backend Developer - Gojek")
  assert.equal(f.company, "Jobstreet")
  assert.equal(f.description, "Build scalable services.")
  assert.equal(f.location, undefined)
})

test("parseJobstreet extracts salary from page text", () => {
  const f = parseJobstreet(JOBSTREET_WITH_SALARY)
  assert.equal(f.salary, "Rp 10.000.000 - Rp 15.000.000 per bulan")
})

test("description preserves paragraph line breaks", () => {
  const f = parseGlints(DESC_HTML)
  assert.ok(f.description?.includes("First paragraph."))
  assert.ok(f.description?.includes("\n"))
  assert.ok(!f.description?.includes("<b>"))
})

test("parsers return empty fields for pages with no data", () => {
  const f = parseGlints(EMPTY_HTML)
  assert.equal(f.title, undefined)
  assert.equal(f.company, undefined)
  assert.equal(f.description, undefined)
})

const JOBSTREET_DOM = `<!DOCTYPE html><html><head><title>x</title></head>
<body>
  <h1 data-automation="job-detail-title">Fit Test Analyst - Footwear Industry</h1>
  <div data-automation="job-detail-company"><a href="/id/Deckers-International-Hk-Limited-jobs/at-this-company">Deckers International HK Limited</a></div>
  <div data-automation="job-detail-location">Jakarta Raya</div>
  <div data-automation="job-detail-industry">Uji Coba &amp; Penjaminan Mutu</div>
  <div data-automation="job-detail-work-type">Full time</div>
  <div data-automation="job-detail-salary">Masuk ke akunmu untuk melihat gaji</div>
  <div data-automation="job-detail-date">Diposting 29 hari yang lalu</div>
  <div data-automation="jobAdDetails"><p>Run fit tests on footwear.</p><p>Ensure quality standards.</p></div>
  <section><p>Qualifications: degree in engineering.</p></section>
</body></html>`

test("parseJobstreet extracts from data-automation selectors", () => {
  const f = parseJobstreet(JOBSTREET_DOM)
  assert.equal(f.title, "Fit Test Analyst - Footwear Industry")
  assert.equal(f.company, "Deckers International HK Limited")
  assert.equal(f.location, "Jakarta Raya")
  assert.equal(f.category, "Uji Coba & Penjaminan Mutu")
  assert.equal(f.employmentType, "Full time")
  assert.equal(f.salary, undefined)
  assert.ok(f.description?.includes("Run fit tests on footwear."))
  assert.ok(f.description?.includes("Qualifications: degree in engineering."))
  assert.ok(f.postedAt && !Number.isNaN(Date.parse(f.postedAt)))
})

test("parseJobstreet extracts job id from url", () => {
  const f = parseJobstreet(JOBSTREET_DOM, "https://www.jobstreet.co.id/job/93518632")
  assert.equal(f.externalJobId, "93518632")
})

const GLINTS_DOM = `<!DOCTYPE html><html><head><title>x</title></head>
<body>
<main>
  <nav aria-label="Breadcrumb"><a href="/id/jobs">Lowongan</a><a href="/id/tech">Teknologi</a><a href="/id/jkt">Jakarta</a></nav>
  <h1>Frontend Engineer</h1>
  <a href="/id/companies/pt-sigma-global-teknologi/1cb01218-d1de-4e0c-b7a4-cb7865f3baae">PT Teknologi Cerdas</a>
  <p>Rp 15.000.000 - Rp 20.000.000 per bulan</p>
  <p>Full time</p>
  <p>Minimal 3 tahun pengalaman</p>
  <p>Pendidikan minimal Sarjana</p>
  <h2>Skills</h2>
  <div><span>React</span><span>TypeScript</span></div>
  <h2>Deskripsi pekerjaan</h2>
  <p>Build great UI.</p><p>Work with team.</p>
  <h2>Tentang Perusahaan</h2>
  <p>PT Teknologi Cerdas adalah perusahaan teknologi.</p>
  <p>Kami memiliki 200 karyawan</p>
  <a href="https://example.com">Website</a>
  <a href="https://linkedin.com/company/abc">LinkedIn</a>
  <h2>Alamat kantor</h2>
  <p>Jl. Sudirman No. 1, Jakarta</p>
</main>
</body></html>`

test("parseGlints extracts via structural selectors", () => {
  const f = parseGlints(
    GLINTS_DOM,
    "https://glints.com/id/opportunities/jobs/82373ac6-6524-4f67-90b4-de7d785ec1b1/share/b5c6299f-dd0d-446e-8715-a53e72a80d08",
  )
  assert.equal(f.title, "Frontend Engineer")
  assert.equal(f.company, "PT Teknologi Cerdas")
  assert.equal(
    f.companyRefId,
    "1cb01218-d1de-4e0c-b7a4-cb7865f3baae",
  )
  assert.equal(f.location, "Jakarta")
  assert.equal(f.category, "Teknologi")
  assert.ok(f.salary?.includes("Rp 15.000.000"))
  assert.equal(f.employmentType, "Full time")
  assert.ok(f.experience?.includes("tahun pengalaman"))
  assert.ok(f.education?.includes("Sarjana"))
  assert.deepEqual(f.skills, ["React", "TypeScript"])
  assert.ok(f.description?.includes("Build great UI."))
  assert.ok(f.description?.includes("Work with team."))
  assert.ok(!f.description?.includes("Tentang Perusahaan"))
  assert.equal(f.recruiter, undefined)
  assert.equal(f.externalJobId, "82373ac6-6524-4f67-90b4-de7d785ec1b1")
  assert.equal(f.shareToken, "b5c6299f-dd0d-446e-8715-a53e72a80d08")
  assert.equal(f.companyDetails?.size, "Kami memiliki 200 karyawan")
  assert.equal(f.companyDetails?.website, "https://example.com")
  assert.equal(f.companyDetails?.linkedin, "https://linkedin.com/company/abc")
  assert.ok(f.companyDetails?.about?.includes("perusahaan teknologi"))
  assert.equal(f.companyDetails?.address, "Jl. Sudirman No. 1, Jakarta")
})
