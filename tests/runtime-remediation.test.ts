import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../lib/env";
import { createFixedWindowRateLimiter } from "../lib/rate-limit";
import { hasPdfMagic } from "../lib/pdf";
import { parseProfileUpdate } from "../lib/profile-input";
import {
  applicationPatchSchema,
  resolveAppliedAt,
} from "../lib/application-input";
import { parseJobSearchInput } from "../lib/job-search-input";
import { parseKeywordRecommendation } from "../lib/recommend-keywords";
import { callChatJson, getLlmTimeoutMs, parseCvLlmOutput } from "../lib/llm";
import { parseCoverLetterLlmOutput } from "../lib/cover-letter";
import { createMatchCacheKey, parseMatchLlmOutput } from "../lib/match";
import type { Job, Profile } from "@/lib/generated/prisma/client";

const baseEnv = {
  DATABASE_URL: "postgresql://user:pass@example.com:5432/jobhunter",
  AUTH_SECRET: "secret",
  NODE_ENV: "development",
};

test("environment validation requires the database and paired service settings", () => {
  assert.equal(validateEnv(baseEnv).DATABASE_URL, baseEnv.DATABASE_URL);
  assert.throws(() => validateEnv({ ...baseEnv, DATABASE_URL: undefined }));
  assert.throws(() => validateEnv({ ...baseEnv, LLM_API_KEY: "key" }));
  assert.throws(() =>
    validateEnv({ ...baseEnv, MINIO_ENDPOINT: "minio", MINIO_PORT: "9000" }),
  );
  assert.doesNotThrow(() =>
    validateEnv({
      ...baseEnv,
      LLM_API_KEY: "key",
      LLM_BASE_URL: "https://llm.example.com/v1",
      MINIO_ENDPOINT: "minio",
      MINIO_ACCESS_KEY: "access",
      MINIO_SECRET_KEY: "secret",
    }),
  );
});

test("production environment requires AUTH_URL", () => {
  assert.throws(() => validateEnv({ ...baseEnv, NODE_ENV: "production" }));
  assert.throws(() =>
    validateEnv({
      ...baseEnv,
      NODE_ENV: "production",
      AUTH_URL: "https://jobs.example.com",
    }),
  );
  assert.doesNotThrow(() =>
    validateEnv({
      ...baseEnv,
      AUTH_SECRET: "a-secure-production-secret-with-32-characters",
      NODE_ENV: "production",
      AUTH_URL: "https://jobs.example.com",
    }),
  );
});

test("fixed-window limiter isolates keys and resets at the boundary", () => {
  let now = 1_000;
  const limit = createFixedWindowRateLimiter({
    limit: 2,
    windowMs: 100,
    now: () => now,
  });

  assert.equal(limit("user-a"), true);
  assert.equal(limit("user-a"), true);
  assert.equal(limit("user-a"), false);
  assert.equal(limit("user-b"), true);
  now = 1_100;
  assert.equal(limit("user-a"), true);
});

test("PDF validation checks the actual magic bytes", () => {
  assert.equal(hasPdfMagic(Buffer.from("%PDF-1.7\n")), true);
  assert.equal(hasPdfMagic(Buffer.from("not a pdf")), false);
  assert.equal(hasPdfMagic(Buffer.from(" \n%PDF-1.7")), false);
});

test("profile input can clear arrays and preserves education periods", () => {
  const parsed = parseProfileUpdate({
    email: "candidate@example.com",
    skills: [],
    links: [],
    education: [{ school: "UI", degree: "S.T.", period: "2020-2024" }],
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.deepEqual(parsed.data.skills, []);
  assert.deepEqual(parsed.data.links, []);
  assert.equal(parsed.data.education?.[0].period, "2020-2024");

  const clearedEmail = parseProfileUpdate({ email: "" });
  assert.equal(clearedEmail.success, true);
  if (clearedEmail.success) assert.equal(clearedEmail.data.email, null);
  assert.equal(parseProfileUpdate({ email: "invalid" }).success, false);
});

test("application input rejects invalid dates and enforces applied transitions", () => {
  assert.equal(
    applicationPatchSchema.safeParse({ appliedAt: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    applicationPatchSchema.safeParse({ nextFollowUpAt: "2026-08-23" }).success,
    true,
  );

  const now = new Date("2026-08-23T12:00:00.000Z");
  assert.equal(
    resolveAppliedAt({
      currentStatus: "WISHLIST",
      currentAppliedAt: null,
      nextStatus: "APPLIED",
      now,
    }),
    now,
  );
  assert.equal(
    resolveAppliedAt({
      currentStatus: "APPLIED",
      currentAppliedAt: now,
      nextStatus: "WISHLIST",
    }),
    null,
  );
  assert.equal(
    resolveAppliedAt({
      currentStatus: "APPLIED",
      currentAppliedAt: now,
      inputAppliedAt: null,
    }),
    null,
  );
});

test("job-search input rejects unknown or incorrectly typed fields", () => {
  assert.equal(
    parseJobSearchInput({ keywords: ["React"], location: "Jakarta" }).success,
    true,
  );
  assert.equal(parseJobSearchInput({ keywords: [123] }).success, false);
  assert.equal(
    parseJobSearchInput({ keywords: [], unexpected: true }).success,
    false,
  );
  assert.equal(parseJobSearchInput(null).success, false);
});

test("each LLM output parser rejects coercion and extra fields", () => {
  const cv = {
    fullName: "Ayu",
    headline: "Engineer",
    location: "Jakarta",
    email: "ayu@example.com",
    phone: "0812",
    skills: ["TypeScript"],
    summary: "Engineer",
    experience: [],
    education: [],
    certifications: [],
    links: [],
  };
  assert.equal(parseCvLlmOutput(cv).fullName, "Ayu");
  assert.throws(() => parseCvLlmOutput({ ...cv, skills: [123] }));
  assert.throws(() => parseCvLlmOutput({ ...cv, extra: true }));

  assert.equal(
    parseMatchLlmOutput({
      score: 80,
      matchedSkills: ["React"],
      missingSkills: [],
      rationale: "Relevant",
    }).score,
    80,
  );
  assert.throws(() =>
    parseMatchLlmOutput({
      score: "80",
      matchedSkills: [],
      missingSkills: [],
      rationale: "Relevant",
    }),
  );
  assert.equal(
    parseCoverLetterLlmOutput({ coverLetter: "Dengan hormat" }),
    "Dengan hormat",
  );
  assert.throws(() =>
    parseCoverLetterLlmOutput({ coverLetter: "Dengan hormat", extra: true }),
  );
  assert.deepEqual(
    parseKeywordRecommendation({
      keywords: ["React"],
      summary: "Sesuai profil",
    }),
    { keywords: ["React"], summary: "Sesuai profil" },
  );
  assert.throws(() =>
    parseKeywordRecommendation({ keywords: ["React", 4], summary: "Sesuai" }),
  );
});

test("match cache key changes with job content but not object key order", () => {
  const profile = {
    id: "profile-1",
    updatedAt: new Date("2026-08-23T00:00:00.000Z"),
  } as Profile;
  const job = {
    id: "job-1",
    title: "Engineer",
    company: "Acme",
    source: "GLINTS",
    sourceUrl: "https://glints.com/id/jobs/1",
    description: "Build APIs",
    skills: ["TypeScript"],
    companyDetails: { size: "10", industry: "Technology" },
  } as unknown as Job;
  const reordered = {
    ...job,
    companyDetails: { industry: "Technology", size: "10" },
  } as Job;

  assert.equal(
    createMatchCacheKey(profile, job),
    createMatchCacheKey(profile, reordered),
  );
  assert.notEqual(
    createMatchCacheKey(profile, job),
    createMatchCacheKey(profile, { ...job, description: "Build data systems" }),
  );
});

test("chat requests carry an AbortSignal timeout", async () => {
  const previousFetch = globalThis.fetch;
  const previousBaseUrl = process.env.LLM_BASE_URL;
  const previousApiKey = process.env.LLM_API_KEY;
  process.env.LLM_BASE_URL = "https://llm.example.com/v1";
  process.env.LLM_API_KEY = "secret";

  let requestSignal: AbortSignal | null | undefined;
  globalThis.fetch = async (_input, init) => {
    requestSignal = init?.signal;
    return Response.json({
      choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
    });
  };

  try {
    assert.deepEqual(await callChatJson("system", "user"), { ok: true });
    assert.ok(requestSignal instanceof AbortSignal);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBaseUrl === undefined) delete process.env.LLM_BASE_URL;
    else process.env.LLM_BASE_URL = previousBaseUrl;
    if (previousApiKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = previousApiKey;
  }
});

test("LLM timeout is configurable within a bounded range", () => {
  const previous = process.env.LLM_TIMEOUT_MS;
  try {
    delete process.env.LLM_TIMEOUT_MS;
    assert.equal(getLlmTimeoutMs(), 120_000);
    process.env.LLM_TIMEOUT_MS = "90000";
    assert.equal(getLlmTimeoutMs(), 90_000);
    process.env.LLM_TIMEOUT_MS = "999999";
    assert.equal(getLlmTimeoutMs(), 120_000);
    assert.throws(() => validateEnv({ ...baseEnv, LLM_TIMEOUT_MS: "4000" }));
  } finally {
    if (previous === undefined) delete process.env.LLM_TIMEOUT_MS;
    else process.env.LLM_TIMEOUT_MS = previous;
  }
});
