import { test } from "node:test"
import assert from "node:assert/strict"
import {
  buildSearchUrls,
  isJobDetailUrl,
  extractJobLinks,
} from "../lib/scrapers/search"

test("buildSearchUrls caps skills and encodes terms", () => {
  const urls = buildSearchUrls(
    ["React", "Node.js", "Go", "Rust", "Python", "Java"],
    "GLINTS",
    5,
  )
  assert.equal(urls.length, 5)
  assert.equal(
    urls[0],
    "https://glints.com/id/opportunities/jobs/explore?keyword=React&country=ID",
  )
  assert.ok(urls[1].includes("keyword=Node.js"))
})

test("buildSearchUrls uses jobstreet host for JOBSTREET", () => {
  const urls = buildSearchUrls(["Data Engineer"], "JOBSTREET")
  assert.equal(urls.length, 1)
  assert.ok(urls[0].startsWith("https://www.jobstreet.co.id/en/job-search?key="))
})

test("buildSearchUrls empty skills returns nothing", () => {
  assert.equal(buildSearchUrls([], "GLINTS").length, 0)
})

test("isJobDetailUrl recognizes glints detail pages", () => {
  assert.equal(
    isJobDetailUrl(
      "https://glints.com/id/opportunities/jobs/abc-123/share/xyz",
      "GLINTS",
    ),
    true,
  )
  assert.equal(isJobDetailUrl("https://glints.com/id/job/foo", "GLINTS"), true)
  assert.equal(
    isJobDetailUrl("https://glints.com/id/companies/foo", "GLINTS"),
    false,
  )
  assert.equal(
    isJobDetailUrl("https://example.com/id/job/foo", "GLINTS"),
    false,
  )
})

test("isJobDetailUrl recognizes jobstreet detail pages", () => {
  assert.equal(
    isJobDetailUrl("https://www.jobstreet.co.id/id/job/1234567", "JOBSTREET"),
    true,
  )
  assert.equal(
    isJobDetailUrl("https://jobstreet.com/en/job/abc", "JOBSTREET"),
    true,
  )
  assert.equal(
    isJobDetailUrl("https://www.jobstreet.co.id/en/job-search?key=x", "JOBSTREET"),
    false,
  )
})

test("extractJobLinks pulls only detail links", () => {
  const html = `
    <a href="/id/opportunities/jobs/abc-1/share/x">Job A</a>
    <a href="https://glints.com/id/job/foo">Job B</a>
    <a href="/id/companies/acme">Company</a>
    <a href="https://glints.com/id/opportunities/jobs/abc-1/share/x">Dup</a>
  `
  const links = extractJobLinks(html, "GLINTS", "https://glints.com/id/explore")
  assert.equal(links.length, 2)
  assert.ok(links.includes("https://glints.com/id/opportunities/jobs/abc-1/share/x"))
  assert.ok(links.includes("https://glints.com/id/job/foo"))
})
