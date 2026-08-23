import assert from "node:assert/strict";
import { test } from "node:test";

import {
  jobVisibilityWhere,
  parseTrustedJobPayload,
  privateJobDedupeKey,
  savedJobDisplayOrigin,
} from "../lib/job-data";
import { signJobPreview, verifyJobPreview } from "../lib/job-preview";

const secret = "test-preview-secret";
const now = Date.UTC(2026, 7, 23, 12);
const parsedJob = parseTrustedJobPayload({
  title: "Backend Engineer",
  company: "Example",
  source: "GLINTS",
  sourceUrl: "https://glints.com/id/opportunities/jobs/backend-engineer/123",
  skills: ["TypeScript"],
});

assert.equal(parsedJob.success, true);
if (!parsedJob.success) throw new Error("Test fixture must be valid");
const job = parsedJob.data;

test("job preview verifies for its bound user", () => {
  const token = signJobPreview(job, "user-a", { secret, now, ttlMs: 1000 });
  assert.deepEqual(
    verifyJobPreview(token, "user-a", { secret, now: now + 999 }),
    job,
  );
  assert.equal(verifyJobPreview(token, "user-b", { secret, now }), null);
});

test("job preview rejects tampering and expiry", () => {
  const token = signJobPreview(job, "user-a", { secret, now, ttlMs: 1000 });
  const [payload, signature] = token.split(".");
  const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}`;

  assert.equal(
    verifyJobPreview(`${tamperedPayload}.${signature}`, "user-a", {
      secret,
      now,
    }),
    null,
  );
  assert.equal(
    verifyJobPreview(`${payload}.${signature.slice(1)}`, "user-a", {
      secret,
      now,
    }),
    null,
  );
  assert.equal(
    verifyJobPreview(token, "user-a", { secret, now: now + 1000 }),
    null,
  );
});

test("job helpers namespace private dedupe and constrain visibility", () => {
  assert.equal(
    privateJobDedupeKey("user-a", job.sourceUrl),
    `private:user-a:${job.sourceUrl}`,
  );
  assert.notEqual(
    privateJobDedupeKey("user-a", job.sourceUrl),
    privateJobDedupeKey("user-b", job.sourceUrl),
  );
  assert.deepEqual(jobVisibilityWhere("user-a").OR[0], {
    scope: "PRIVATE",
    ownerId: "user-a",
  });
});

test("saved job origin preserves manual and search provenance", () => {
  assert.equal(savedJobDisplayOrigin("MANUAL", false), "manual");
  assert.equal(savedJobDisplayOrigin("SEARCH", true), "auto");
  assert.equal(savedJobDisplayOrigin("MANUAL", true), "both");
  assert.equal(savedJobDisplayOrigin(undefined, false), null);
});

test("trusted payload requires a matching supported HTTPS source", () => {
  assert.equal(
    parseTrustedJobPayload({
      ...job,
      source: "JOBSTREET",
    }).success,
    false,
  );
  assert.equal(
    parseTrustedJobPayload({
      ...job,
      sourceUrl: "http://glints.com/id/jobs/123",
    }).success,
    false,
  );
});
