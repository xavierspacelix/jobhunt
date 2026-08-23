import { test } from "node:test"
import assert from "node:assert/strict"
import { heuristicMatch, llmMatch } from "../lib/match"
import type { Job, Profile } from "@/lib/generated/prisma/client"

function profile(skills: string[]): Profile {
  return {
    id: "p1",
    userId: "u1",
    skills,
  } as Profile
}

function job(skills: string[]): Job {
  return {
    id: "j1",
    title: "Engineer",
    company: "Acme",
    source: "GLINTS",
    sourceUrl: "https://glints.com/id/jobs/1",
    skills,
  } as Job
}

test("heuristic match scores full overlap as 100", () => {
  const r = heuristicMatch(profile(["React", "TypeScript"]), job(["React", "TypeScript"]))
  assert.equal(r.score, 100)
  assert.deepEqual(r.matchedSkills.sort(), ["React", "TypeScript"])
  assert.equal(r.missingSkills.length, 0)
  assert.equal(r.source, "heuristic")
})

test("heuristic match scores partial overlap proportionally", () => {
  const r = heuristicMatch(profile(["React", "Vue"]), job(["React", "Angular", "Node.js"]))
  assert.equal(r.score, Math.round((1 / 3) * 100))
  assert.deepEqual(r.matchedSkills, ["React"])
  assert.deepEqual(r.missingSkills.sort(), ["Angular", "Node.js"])
})

test("heuristic match with no job skills falls back to description scan", () => {
  const j = job([])
  j.description = "We need someone strong in React and Docker."
  const r = heuristicMatch(profile(["React", "Go", "Docker"]), j)
  assert.equal(r.score, Math.round((2 / 3) * 100))
})

test("heuristic match with no skills anywhere scores 0", () => {
  const r = heuristicMatch(profile([]), job([]))
  assert.equal(r.score, 0)
})

test("alias normalization collapses variant skill spellings", () => {
  const p = profile([
    "Backend Developer",
    "RestFull API",
    "Pemrograman JavaScript",
    "Microservices",
  ])
  const j = job([
    "Backend Development",
    "RESTful API",
    "JavaScript",
    "Microservices",
    "Express.js",
    "Node.js",
  ])
  const r = heuristicMatch(p, j)
  // 4 of 6 job skills match via canonical aliases; Express.js/Node.js missing.
  assert.equal(r.score, Math.round((4 / 6) * 100))
  assert.equal(r.matchedSkills.length, 4)
  assert.deepEqual(r.missingSkills.sort(), ["Express.js", "Node.js"])
})

test("stripping .js keeps React distinct from JavaScript family", () => {
  const p = profile(["React.js", "Pemrograman PHP"])
  const j = job(["React.js", "PHP", "Node.js"])
  const r = heuristicMatch(p, j)
  assert.equal(r.score, Math.round((2 / 3) * 100))
  assert.deepEqual(r.missingSkills, ["Node.js"])
})

test("LLM matching bounds the job description context", async () => {
  const previousFetch = globalThis.fetch
  const previousBaseUrl = process.env.LLM_BASE_URL
  const previousApiKey = process.env.LLM_API_KEY
  process.env.LLM_BASE_URL = "https://llm.example.com/v1"
  process.env.LLM_API_KEY = "secret"
  let requestBody = ""
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? "")
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 50,
              matchedSkills: [],
              missingSkills: [],
              rationale: "Bounded prompt",
            }),
          },
        },
      ],
    })
  }

  try {
    const longJob = job([])
    longJob.description = `${"a".repeat(12_000)}UNSENT_TAIL`
    await llmMatch(profile([]), longJob)
    assert.doesNotMatch(requestBody, /UNSENT_TAIL/)
  } finally {
    globalThis.fetch = previousFetch
    if (previousBaseUrl === undefined) delete process.env.LLM_BASE_URL
    else process.env.LLM_BASE_URL = previousBaseUrl
    if (previousApiKey === undefined) delete process.env.LLM_API_KEY
    else process.env.LLM_API_KEY = previousApiKey
  }
})
