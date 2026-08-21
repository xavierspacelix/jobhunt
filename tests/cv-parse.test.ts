import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractCv, heuristicCv } from "../lib/llm";
import { parsePdf } from "../lib/cv-parse";

const SAMPLE = `John Doe
Senior Software Engineer

Skills: React, TypeScript, Node.js, PostgreSQL, Docker, AWS
Experience:
Software Engineer at Acme Corp (2020 - 2023)
Tech Lead at Globex (2023 - present)

Summary: Experienced engineer building web apps.`;

test("heuristicCv extracts known skills from CV text", () => {
  const data = heuristicCv(SAMPLE);
  for (const skill of [
    "React",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "AWS",
  ]) {
    assert.ok(data.skills.includes(skill), `expected skill ${skill}`);
  }
});

test("heuristicCv detects experience lines containing years", () => {
  const data = heuristicCv(SAMPLE);
  assert.ok(data.experience.length >= 1, "should detect at least one role");
  assert.ok(
    data.experience.some((e) => e.period && /2020/.test(e.period)),
    "should capture the 2020 role",
  );
});

test("heuristicCv produces a non-empty summary", () => {
  const data = heuristicCv(SAMPLE);
  assert.ok(data.summary.length > 0);
});

test("extractCv uses heuristic fallback when LLM env is absent", async () => {
  const prevKey = process.env.LLM_API_KEY;
  const prevUrl = process.env.LLM_BASE_URL;
  delete process.env.LLM_API_KEY;
  delete process.env.LLM_BASE_URL;
  try {
    const data = await extractCv(SAMPLE);
    assert.ok(data.skills.length > 0);
  } finally {
    if (prevKey) process.env.LLM_API_KEY = prevKey;
    if (prevUrl) process.env.LLM_BASE_URL = prevUrl;
  }
});

test("parsePdf extracts text from a real PDF via pdf-parse", async () => {
  const fixture = path.join(process.cwd(), "tests", "fixtures", "sample-cv.pdf");
  if (!fs.existsSync(fixture)) return;
  const text = await parsePdf(fs.readFileSync(fixture));
  assert.ok(text.length > 0, "extracted text should be non-empty");
});
