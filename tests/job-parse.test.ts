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
