import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPkceS256Challenge,
  extensionCorsHeaders,
  extensionOriginMatchesRedirectUri,
  generateExtensionSecret,
  hashExtensionSecret,
  isValidExtensionOrigin,
  isValidExtensionRedirectUri,
  isValidExtensionState,
  isValidPkceChallenge,
  isValidPkceVerifier,
  parseExtensionBearerToken,
  verifyPkceS256,
} from "../lib/extension-auth";
import { readBoundedRequestBody } from "../lib/extension-api";
import { extensionJobInputSchema } from "../lib/job-data";

const extensionId = "lokhjkfokakakehiojciicjhfokmkldg";
const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

test("PKCE S256 follows RFC 7636 and rejects malformed input", () => {
  assert.equal(createPkceS256Challenge(verifier), challenge);
  assert.equal(verifyPkceS256(verifier, challenge), true);
  assert.equal(verifyPkceS256(`${verifier}!`, challenge), false);
  assert.equal(verifyPkceS256(verifier, `${challenge}x`), false);
  assert.equal(isValidPkceVerifier("a".repeat(43)), true);
  assert.equal(isValidPkceVerifier("a".repeat(42)), false);
  assert.equal(isValidPkceChallenge(challenge), true);
});

test("extension redirect, origin, and state validation is exact", () => {
  const redirect = `https://${extensionId}.chromiumapp.org/connected`;
  const origin = `chrome-extension://${extensionId}`;

  assert.equal(isValidExtensionRedirectUri(redirect), true);
  assert.equal(isValidExtensionRedirectUri(`${redirect}/`), false);
  assert.equal(
    isValidExtensionRedirectUri(
      `https://${"q".repeat(32)}.chromiumapp.org/connected`,
    ),
    false,
  );
  assert.equal(isValidExtensionOrigin(origin), true);
  assert.equal(isValidExtensionOrigin(`chrome-extension://${"a".repeat(32)}`), false);
  assert.equal(extensionOriginMatchesRedirectUri(origin, redirect), true);
  assert.equal(
    extensionOriginMatchesRedirectUri(
      `chrome-extension://${"b".repeat(32)}`,
      redirect,
    ),
    false,
  );
  assert.equal(isValidExtensionOrigin(`${origin}/`), false);
  assert.equal(isValidExtensionOrigin("https://example.com"), false);
  assert.equal(isValidExtensionState("s".repeat(32)), true);
  assert.equal(isValidExtensionState("short"), false);

  const headers = extensionCorsHeaders(origin);
  assert.equal(headers["Access-Control-Allow-Origin"], origin);
  assert.equal("Access-Control-Allow-Credentials" in headers, false);
});

test("extension secrets are random, SHA-256 hashed, and strictly parsed", () => {
  const first = generateExtensionSecret();
  const second = generateExtensionSecret();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.equal(
    hashExtensionSecret("secret"),
    "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b",
  );
  assert.equal(parseExtensionBearerToken(`Bearer ${first}`), first);
  assert.equal(parseExtensionBearerToken(`bearer ${first}`), first);
  assert.equal(parseExtensionBearerToken(`Bearer  ${first}`), null);
  assert.equal(parseExtensionBearerToken(`Basic ${first}`), null);
  assert.equal(parseExtensionBearerToken(null), null);
});

test("extension request bodies are bounded by UTF-8 bytes while streaming", async () => {
  const accepted = await readBoundedRequestBody(
    new Request("https://jobhunter.test", { method: "POST", body: "é".repeat(10) }),
    20,
  );
  assert.deepEqual(accepted, { ok: true, text: "é".repeat(10) });

  const rejected = await readBoundedRequestBody(
    new Request("https://jobhunter.test", { method: "POST", body: "é".repeat(11) }),
    20,
  );
  assert.deepEqual(rejected, { ok: false, reason: "too_large" });
});

test("extension company links accept only HTTP and HTTPS", () => {
  const baseJob = {
    title: "Engineer",
    company: "Example",
    location: null,
    salary: null,
    source: "GLINTS" as const,
    sourceUrl: "https://glints.com/id/opportunities/jobs/example",
    description: null,
    postedAt: null,
    employmentType: null,
    experience: null,
    education: null,
    category: null,
    recruiter: null,
    skills: [],
    externalJobId: null,
  };
  assert.equal(
    extensionJobInputSchema.safeParse({
      ...baseJob,
      companyDetails: { website: "https://example.com" },
    }).success,
    true,
  );
  assert.equal(
    extensionJobInputSchema.safeParse({
      ...baseJob,
      companyDetails: { website: "javascript:alert(1)" },
    }).success,
    false,
  );
});
