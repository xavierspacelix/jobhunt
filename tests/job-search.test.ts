import { test } from "node:test"
import assert from "node:assert/strict"
import {
  BATCH_LIMIT,
  parseKeywords,
  toJobData,
  locationMatches,
  selectBalancedTargets,
  rankQualifiedMatches,
  searchRunHasFailed,
  searchRunHasWarnings,
} from "../lib/job-search"
import { isClosedFromText } from "../lib/scrapers/shared"
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

test("BATCH_LIMIT is 30 for bounded AI recommendation search", () => {
  assert.equal(BATCH_LIMIT, 30)
})

test("selectBalancedTargets reserves half the batch for each source", () => {
  const glints = Array.from(
    { length: 30 },
    (_, i) => `https://glints.com/job/${i}`,
  )
  const jobstreet = Array.from(
    { length: 30 },
    (_, i) => `https://jobstreet.co.id/job/${i}`,
  )
  const selected = selectBalancedTargets({
    GLINTS: glints,
    JOBSTREET: jobstreet,
  })

  assert.equal(selected.length, 30)
  assert.equal(selected.filter((url) => url.includes("glints.com")).length, 15)
  assert.equal(
    selected.filter((url) => url.includes("jobstreet.co.id")).length,
    15,
  )
})

test("selectBalancedTargets backfills when one source has fewer jobs", () => {
  const selected = selectBalancedTargets({
    GLINTS: ["https://glints.com/job/1"],
    JOBSTREET: Array.from(
      { length: 40 },
      (_, i) => `https://jobstreet.co.id/job/${i}`,
    ),
  })

  assert.equal(selected.length, 30)
  assert.equal(selected.filter((url) => url.includes("glints.com")).length, 1)
})

test("rankQualifiedMatches keeps AI scores at least 70 and sorts descending", () => {
  const matches = [68, 92, 70, 81].map((score) => ({
    id: String(score),
    match: {
      score,
      matchedSkills: [],
      missingSkills: [],
      source: "ai" as const,
      profileRevision: "2026-08-24T00:00:00.000Z",
    },
  }))

  assert.deepEqual(
    rankQualifiedMatches(matches).map((result) => result.match.score),
    [92, 81, 70],
  )
})

test("search completion distinguishes full failure from partial warnings", () => {
  const base = {
    type: "done" as const,
    collected: 30,
    details: 20,
    inspected: 20,
    results: 4,
    searchPages: 20,
    message: "done",
  }

  assert.equal(searchRunHasFailed({ ...base, aiFailures: 20 }), true)
  assert.equal(searchRunHasWarnings({ ...base, aiFailures: 2 }), true)
  assert.equal(searchRunHasFailed({ ...base, aiFailures: 2 }), false)
  assert.equal(
    searchRunHasFailed({
      ...base,
      collected: 0,
      details: 0,
      inspected: 0,
      results: 0,
      searchFailures: 10,
      searchPages: 10,
    }),
    true,
  )
  assert.equal(searchRunHasWarnings(base), false)
  assert.equal(searchRunHasWarnings({ ...base, invalid: 1 }), true)
  assert.equal(searchRunHasFailed({ ...base, results: 0, invalid: 3 }), true)
  assert.equal(
    searchRunHasFailed({
      ...base,
      inspected: 0,
      results: 0,
      blocked: 20,
    }),
    true,
  )
})

test("parseKeywords splits on commas/newlines, trims, and caps at 10", () => {
  assert.deepEqual(parseKeywords("React, Node.js ,Go"), [
    "React",
    "Node.js",
    "Go",
  ])
  assert.deepEqual(parseKeywords("React\nVue\r\nSvelte"), [
    "React",
    "Vue",
    "Svelte",
  ])
  assert.deepEqual(parseKeywords("  "), [])
  const many = Array.from({ length: 15 }, (_, i) => `k${i}`)
  assert.equal(parseKeywords(many).length, 10)
})

test("toJobData returns null when title is missing", () => {
  assert.equal(
    toJobData(fields({ title: "" }), "GLINTS", "https://glints.com/x"),
    null,
  )
  assert.equal(
    toJobData(fields({ title: undefined }), "GLINTS", "https://glints.com/x"),
    null,
  )
})

test("toJobData maps parsed fields into Job upsert shape", () => {
  const data = toJobData(
    fields(),
    "JOBSTREET",
    "https://www.jobstreet.co.id/job/1",
  )
  assert.ok(data)
  assert.equal(data!.title, "Frontend Engineer")
  assert.equal(data!.company, "PT Maju")
  assert.equal(data!.source, "JOBSTREET")
  assert.equal(data!.sourceUrl, "https://www.jobstreet.co.id/job/1")
  assert.deepEqual(data!.skills, ["React", "TypeScript"])
  assert.equal(
    data!.postedAt instanceof Date ? data!.postedAt.getFullYear() : null,
    2024,
  )
})

test("toJobData normalizes blank fields and invalid dates", () => {
  const data = toJobData(
    fields({
      company: undefined,
      salary: "   ",
      postedAt: "not-a-date",
      skills: [],
    }),
    "GLINTS",
    "https://glints.com/y",
  )
  assert.ok(data)
  assert.equal(data!.company, "")
  assert.equal(data!.salary, null)
  assert.equal(data!.postedAt, null)
  assert.deepEqual(data!.skills, [])
})

test("locationMatches passes when selection is empty", () => {
  assert.equal(locationMatches("", "Jakarta"), true)
  assert.equal(locationMatches(null, "Bandung"), true)
  assert.equal(locationMatches(undefined, "Surabaya"), true)
})

test("locationMatches Jakarta matches common variants", () => {
  assert.equal(locationMatches("Jakarta", "DKI Jakarta"), true)
  assert.equal(locationMatches("Jakarta", "Jakarta Selatan"), true)
  assert.equal(locationMatches("Jakarta", "Kota Jakarta Barat"), true)
  assert.equal(locationMatches("Jakarta", "Bandung"), false)
})

test("locationMatches remote only matches remote jobs", () => {
  assert.equal(locationMatches("Remote", "Remote (Indonesia)"), true)
  assert.equal(locationMatches("Remote", "Jakarta"), false)
  assert.equal(locationMatches("Jakarta", "Remote"), false)
})

test("isClosedFromText detects closed listings", () => {
  assert.equal(isClosedFromText("Lowongan ini sudah ditutup"), true)
  assert.equal(isClosedFromText("Pendaftaran ditutup besok"), true)
  assert.equal(isClosedFromText("posisi sudah penuh"), true)
  assert.equal(isClosedFromText("Masih dibuka, ayo lamar"), false)
})
