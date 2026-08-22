import { test } from "node:test"
import assert from "node:assert/strict"
import {
  BATCH_LIMIT,
  parseKeywords,
  toJobData,
} from "../lib/job-search"
import type { ParsedFields } from "../lib/scrapers/types"

function fields(overrides: Partial<ParsedFields> = {}): ParsedFields {
  return {
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salary: "10-15 jt",
    description: "Build UI",
    postedAt: "2024-01-15",
    employmentType: "Full-time",
    experience: "3 yrs",
    education: "S1",
    category: "Engineering",
    recruiter: "Talent Team",
    skills: ["React", "TypeScript"],
    externalJobId: "ext-1",
    shareToken: "tok",
    companyRefId: "c-1",
    ...overrides,
  }
}

test("BATCH_LIMIT is 20 per the spec", () => {
  assert.equal(BATCH_LIMIT, 20)
})

test("parseKeywords splits on commas/newlines, trims, and caps at 10", () => {
  assert.deepEqual(parseKeywords("React, Node.js ,Go"), ["React", "Node.js", "Go"])
  assert.deepEqual(parseKeywords("React\nVue\r\nSvelte"), ["React", "Vue", "Svelte"])
  assert.deepEqual(parseKeywords("  "), [])
  const many = Array.from({ length: 15 }, (_, i) => `k${i}`)
  assert.equal(parseKeywords(many).length, 10)
})

test("toJobData returns null when title is missing", () => {
  assert.equal(toJobData(fields({ title: "" }), "GLINTS", "https://glints.com/x"), null)
  assert.equal(toJobData(fields({ title: undefined }), "GLINTS", "https://glints.com/x"), null)
})

test("toJobData maps parsed fields into Job upsert shape", () => {
  const data = toJobData(fields(), "JOBSTREET", "https://www.jobstreet.co.id/job/1")
  assert.ok(data)
  assert.equal(data!.title, "Frontend Engineer")
  assert.equal(data!.company, "PT Maju")
  assert.equal(data!.source, "JOBSTREET")
  assert.equal(data!.sourceUrl, "https://www.jobstreet.co.id/job/1")
  assert.deepEqual(data!.skills, ["React", "TypeScript"])
  assert.equal(data!.postedAt instanceof Date ? data!.postedAt.getFullYear() : null, 2024)
})

test("toJobData normalizes blank fields and invalid dates", () => {
  const data = toJobData(
    fields({ company: undefined, salary: "   ", postedAt: "not-a-date", skills: [] }),
    "GLINTS",
    "https://glints.com/y",
  )
  assert.ok(data)
  assert.equal(data!.company, "")
  assert.equal(data!.salary, null)
  assert.equal(data!.postedAt, null)
  assert.deepEqual(data!.skills, [])
})
