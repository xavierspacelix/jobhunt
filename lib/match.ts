import { createHash } from "node:crypto";
import type { Job, Profile } from "@/lib/generated/prisma/client";
import { z } from "zod";
import { callChatJson } from "./llm";

export type MatchResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  source: "ai" | "heuristic";
  cached?: boolean;
};

const matchLlmSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    matchedSkills: z.array(z.string().trim().min(1)),
    missingSkills: z.array(z.string().trim().min(1)),
    rationale: z.string(),
  })
  .strict();

const MATCH_PROMPT_VERSION = "v3";

export function parseMatchLlmOutput(value: unknown): MatchResult {
  const parsed = matchLlmSchema.parse(value);
  return {
    score: parsed.score,
    matchedSkills: parsed.matchedSkills,
    missingSkills: parsed.missingSkills,
    source: "ai",
  };
}

function stableJson(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function jobContentRevision(job: Job): string {
  const content = {
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    source: job.source,
    sourceUrl: job.sourceUrl,
    description: job.description,
    postedAt: job.postedAt,
    employmentType: job.employmentType,
    experience: job.experience,
    education: job.education,
    category: job.category,
    recruiter: job.recruiter,
    skills: job.skills,
    externalJobId: job.externalJobId,
    shareToken: job.shareToken,
    companyRefId: job.companyRefId,
    companyDetails: job.companyDetails,
  };
  return createHash("sha256").update(stableJson(content)).digest("hex");
}

export function createMatchCacheKey(profile: Profile, job: Job): string {
  return createHash("sha256")
    .update(
      `${profile.id}|${profile.updatedAt.toISOString()}|${job.id}|${jobContentRevision(job)}|${MATCH_PROMPT_VERSION}`,
    )
    .digest("hex");
}

// Canonical aliases so variants collapse to one key, e.g.
// "Backend Development" == "Backend Developer",
// "RESTful API" == "RestFull API",
// "Pemrograman JavaScript" == "JavaScript", "React.js" -> "react".
const SKILL_CANON: Record<string, string> = {
  "backend development": "backend",
  "backend developer": "backend",
  "backend dev": "backend",
  "frontend development": "frontend",
  "frontend developer": "frontend",
  "frontend dev": "frontend",
  "full stack development": "fullstack",
  "fullstack developer": "fullstack",
  "restful api": "rest api",
  "restfull api": "rest api",
  "rest api": "rest api",
  restful: "rest",
  "pemrograman javascript": "javascript",
  javascript: "javascript",
  js: "javascript",
  react: "react",
  reactjs: "react",
  vue: "vue",
  vuejs: "vue",
  angular: "angular",
  next: "next",
  nextjs: "next",
  node: "node",
  nodejs: "node",
  express: "express",
  microservice: "microservices",
};

function normalizeSkill(s: string): string {
  let t = s.trim().toLowerCase();
  t = t.replace(/\.(js|ts|jsx|tsx)$/i, "");
  t = t.replace(/^pemrograman\s+/i, "");
  t = t.replace(/\s+/g, " ");
  return SKILL_CANON[t] ?? t;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function collectExperienceText(exp: unknown): string[] {
  const out: string[] = [];
  const arr = Array.isArray(exp) ? exp : [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    for (const key of [
      "role",
      "title",
      "position",
      "company",
      "description",
      "summary",
      "responsibilities",
      "highlights",
    ]) {
      if (typeof o[key] === "string") out.push(o[key] as string);
    }
  }
  return out;
}

function profileContext(profile: Profile): string {
  const parts: string[] = [
    ...(profile.skills ?? []),
    ...collectExperienceText(profile.experience),
    profile.headline ?? "",
    profile.summary ?? "",
  ];
  return parts.filter(Boolean).join("\n");
}

// Extract canonical skill keys from free text using word-boundary matching,
// so e.g. "node.js" in an experience description counts without false hits
// like "json" matching the "js" key.
function canonFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const key of Object.keys(SKILL_CANON)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    if (re.test(lower)) out.push(SKILL_CANON[key]);
  }
  return out;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function heuristicMatch(profile: Profile, job: Job): MatchResult {
  const profCanon = new Set<string>();
  for (const s of profile.skills ?? []) profCanon.add(normalizeSkill(s));
  for (const t of collectExperienceText(profile.experience)) {
    profCanon.add(normalizeSkill(t));
  }
  for (const c of canonFromText(profileContext(profile))) {
    profCanon.add(c);
  }
  const jobMap = new Map<string, string>();
  for (const s of job.skills ?? []) {
    const c = normalizeSkill(s);
    if (!jobMap.has(c)) jobMap.set(c, s);
  }

  const matched: string[] = [];
  const missing: string[] = [];
  for (const [canon, original] of jobMap) {
    if (profCanon.has(canon)) matched.push(original);
    else missing.push(original);
  }

  let score: number;
  if (jobMap.size > 0) {
    score = (matched.length / jobMap.size) * 100;
  } else {
    const desc = (job.description ?? "").toLowerCase();
    const found = (profile.skills ?? [])
      .map(norm)
      .filter((s) => desc.includes(s));
    const denom = Math.max((profile.skills ?? []).length, 1);
    score = (found.length / denom) * 100;
  }

  return {
    score: clampScore(score),
    matchedSkills: matched,
    missingSkills: missing,
    source: "heuristic",
  };
}

export async function llmMatch(
  profile: Profile,
  job: Job,
): Promise<MatchResult> {
  const system =
    "You are a strict but fair recruitment matching engine. Respond with STRICT JSON only, no prose. " +
    "Consider the candidate's FULL profile: listed skills, work experience, and summary. " +
    "Rules: " +
    "1) A required competency is FULLY matched only if clearly evidenced by an explicit skill, a relevant job title, or a directly relevant experience description. " +
    "2) Do NOT assume one technology implies another (React does NOT imply Node.js; JavaScript knowledge does NOT imply Express.js). " +
    "3) DO credit demonstrated adjacent experience: e.g., several years as a Backend/Fullstack Developer using JavaScript is evidence of Node.js familiarity and deserves PARTIAL credit, not zero. " +
    "4) Weight required/hard tech-stack items heavily: a missing required stack item must substantially lower the score UNLESS the candidate's experience strongly demonstrates equivalent capability. " +
    "5) A score of 100 means the candidate meets essentially all stated requirements.";
  const user = `Return JSON with this exact shape:
{
  "score": number (integer 0-100),
  "matchedSkills": string[],
  "missingSkills": string[],
  "rationale": string
}

Candidate profile:
- Headline: ${profile.headline ?? ""}
- Summary: ${profile.summary ?? ""}
- Skills: ${(profile.skills ?? []).join(", ")}
- Work experience:
${collectExperienceText(profile.experience).join("\n") || "(none provided)"}

Job:
- Title: ${job.title}
- Type: ${job.employmentType ?? ""}
- Experience: ${job.experience ?? ""}
- Education: ${job.education ?? ""}
- Skills: ${(job.skills ?? []).join(", ")}
- Description: ${job.description ?? ""}`;
  return parseMatchLlmOutput(await callChatJson(system, user));
}

export async function scoreMatch(
  profile: Profile,
  job: Job,
): Promise<MatchResult> {
  if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
    try {
      return await llmMatch(profile, job);
    } catch (err) {
      console.error(
        "[match] LLM scoring failed, falling back to heuristic",
        err,
      );
    }
  }
  return heuristicMatch(profile, job);
}
