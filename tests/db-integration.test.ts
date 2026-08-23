import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";

import { prisma } from "../lib/db";
import {
  extensionJobsWhere,
  parseTrustedJobPayload,
  privateJobDedupeKey,
} from "../lib/job-data";
import { persistRecommendationPreview } from "../lib/job-recommendation";
import {
  createPkceS256Challenge,
  generateExtensionSecret,
  hashExtensionSecret,
} from "../lib/extension-auth";
import { POST as exchangeExtensionToken } from "../app/api/extension/token/route";
import { GET as getExtensionAccount } from "../app/api/extension/me/route";
import { POST as saveExtensionJob } from "../app/api/extension/jobs/route";

const officialExtensionId = "lokhjkfokakakehiojciicjhfokmkldg";
const officialExtensionOrigin = `chrome-extension://${officialExtensionId}`;
const officialRedirect = `https://${officialExtensionId}.chromiumapp.org/connected`;

function extensionRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`https://jobhunter.test${path}`, {
    ...init,
    headers: {
      origin: officialExtensionOrigin,
      "x-forwarded-for": `test-${randomUUID()}`,
      ...init.headers,
    },
  });
}

test(
  "SavedJob scopes shared jobs without cross-user deletion",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const suffix = randomUUID();
    const emailA = `saved-a-${suffix}@example.test`;
    const emailB = `saved-b-${suffix}@example.test`;
    const jobIds: string[] = [];

    try {
      const [userA, userB] = await Promise.all([
        prisma.user.create({ data: { email: emailA } }),
        prisma.user.create({ data: { email: emailB } }),
      ]);
      const job = await prisma.job.create({
        data: {
          title: "Integration Engineer",
          company: "JobHunter Test",
          source: "GLINTS",
          sourceUrl: `https://glints.com/id/jobs/${suffix}`,
          dedupeKey: `https://glints.com/id/jobs/${suffix}`,
          skills: [],
        },
      });
      jobIds.push(job.id);

      const privateJob = await prisma.job.create({
        data: {
          scope: "PRIVATE",
          ownerId: userA.id,
          dedupeKey: `private:${userA.id}:https://glints.com/id/jobs/${suffix}`,
          title: "Private Draft",
          company: "JobHunter Test",
          source: "GLINTS",
          sourceUrl: `https://glints.com/id/jobs/${suffix}`,
          skills: [],
        },
      });
      jobIds.push(privateJob.id);

      await prisma.savedJob.create({
        data: { userId: userA.id, jobId: job.id, origin: "MANUAL" },
      });

      const [visibleA, visibleB] = await Promise.all([
        prisma.job.findMany({
          where: { savedBy: { some: { userId: userA.id } } },
        }),
        prisma.job.findMany({
          where: { savedBy: { some: { userId: userB.id } } },
        }),
      ]);
      assert.deepEqual(
        visibleA.map(({ id }) => id),
        [job.id],
      );
      assert.deepEqual(visibleB, []);
      assert.ok(
        await prisma.job.findFirst({
          where: { id: privateJob.id, scope: "PRIVATE", ownerId: userA.id },
        }),
      );
      assert.equal(
        await prisma.job.findFirst({
          where: { id: privateJob.id, scope: "PRIVATE", ownerId: userB.id },
        }),
        null,
      );

      await prisma.application.create({
        data: {
          userId: userB.id,
          jobId: job.id,
          matchedSkills: [],
          missingSkills: [],
        },
      });
      await prisma.savedJob.delete({
        where: { userId_jobId: { userId: userA.id, jobId: job.id } },
      });

      assert.ok(await prisma.job.findUnique({ where: { id: job.id } }));
      assert.ok(
        await prisma.application.findUnique({
          where: { userId_jobId: { userId: userB.id, jobId: job.id } },
        }),
      );
    } finally {
      if (jobIds.length) {
        await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
      }
      await prisma.user.deleteMany({
        where: { email: { in: [emailA, emailB] } },
      });
    }
  },
);

test(
  "recommendation save atomically persists signed AI match and rejects stale profiles",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const suffix = randomUUID();
    const email = `recommendation-${suffix}@example.test`;
    const sourceUrl = `https://glints.com/id/jobs/recommendation-${suffix}`;
    const staleSourceUrl = `https://glints.com/id/jobs/stale-${suffix}`;

    try {
      const user = await prisma.user.create({ data: { email } });
      const profile = await prisma.profile.create({
        data: { userId: user.id, skills: ["TypeScript"] },
      });
      const parsed = parseTrustedJobPayload({
        title: "Backend Engineer",
        company: "JobHunter Test",
        source: "GLINTS",
        sourceUrl,
        skills: ["TypeScript", "PostgreSQL"],
      });
      assert.equal(parsed.success, true);
      if (!parsed.success) throw new Error("Test job must be valid");

      const job = await persistRecommendationPreview(user.id, {
        job: parsed.data,
        match: {
          score: 87,
          matchedSkills: ["TypeScript"],
          missingSkills: ["PostgreSQL"],
          source: "ai",
          profileRevision: profile.updatedAt.toISOString(),
        },
      });
      assert.ok(job);

      const [recommendation, savedJob, match] = await Promise.all([
        prisma.recommendation.findUnique({
          where: { userId_jobId: { userId: user.id, jobId: job.id } },
        }),
        prisma.savedJob.findUnique({
          where: { userId_jobId: { userId: user.id, jobId: job.id } },
        }),
        prisma.match.findUnique({
          where: { userId_jobId: { userId: user.id, jobId: job.id } },
        }),
      ]);
      assert.equal(recommendation?.score, 87);
      assert.equal(savedJob?.origin, "SEARCH");
      assert.equal(match?.score, 87);
      assert.equal(match?.source, "ai");

      await prisma.profile.update({
        where: { userId: user.id },
        data: {
          headline: "Updated profile",
          updatedAt: new Date(profile.updatedAt.getTime() + 1000),
        },
      });
      const staleJob = parseTrustedJobPayload({
        ...parsed.data,
        sourceUrl: staleSourceUrl,
      });
      assert.equal(staleJob.success, true);
      if (!staleJob.success) throw new Error("Stale test job must be valid");
      assert.equal(
        await persistRecommendationPreview(user.id, {
          job: staleJob.data,
          match: {
            score: 90,
            matchedSkills: ["TypeScript"],
            missingSkills: [],
            source: "ai",
            profileRevision: profile.updatedAt.toISOString(),
          },
        }),
        null,
      );
      assert.equal(
        await prisma.job.findUnique({ where: { dedupeKey: staleSourceUrl } }),
        null,
      );
    } finally {
      await prisma.job.deleteMany({
        where: { sourceUrl: { in: [sourceUrl, staleSourceUrl] } },
      });
      await prisma.user.deleteMany({ where: { email } });
    }
  },
);

test(
  "extension API exchanges single-use PKCE codes and isolates installations",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const suffix = randomUUID();
    const email = `extension-flow-${suffix}@example.test`;
    const verifier = "v".repeat(43);
    const challenge = createPkceS256Challenge(verifier);
    if (!challenge) throw new Error("Test PKCE verifier must be valid");
    const validChallenge: string = challenge;
    const installationA = "a".repeat(43);
    const installationB = "b".repeat(43);
    const sourceUrl = `https://glints.com/id/opportunities/jobs/${suffix}`;

    async function issueToken(userId: string, installationId: string) {
      const code = generateExtensionSecret();
      await prisma.extensionAuthCode.create({
        data: {
          userId,
          codeHash: hashExtensionSecret(code),
          redirectUri: officialRedirect,
          installationId,
          codeChallenge: validChallenge,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      const body = {
        grantType: "authorization_code",
        code,
        codeVerifier: verifier,
        redirectUri: officialRedirect,
        installationId,
      };
      const response = await exchangeExtensionToken(
        extensionRequest("/api/extension/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      assert.equal(response.status, 200);
      const payload = (await response.json()) as { accessToken: string };
      const replay = await exchangeExtensionToken(
        extensionRequest("/api/extension/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      assert.equal(replay.status, 400);
      return payload.accessToken;
    }

    try {
      const user = await prisma.user.create({ data: { email } });
      const tokenA = await issueToken(user.id, installationA);
      const tokenB = await issueToken(user.id, installationB);
      assert.equal(
        await prisma.extensionConnection.count({ where: { userId: user.id } }),
        2,
      );

      for (const token of [tokenA, tokenB]) {
        const me = await getExtensionAccount(
          extensionRequest("/api/extension/me", {
            headers: { authorization: `Bearer ${token}` },
          }),
        );
        assert.equal(me.status, 200);
      }

      const connectionA = await prisma.extensionConnection.findUniqueOrThrow({
        where: {
          userId_installationId: {
            userId: user.id,
            installationId: installationA,
          },
        },
      });
      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: { expiresAt: new Date(Date.now() - 1) },
      });
      const expiredToken = await getExtensionAccount(
        extensionRequest("/api/extension/me", {
          headers: { authorization: `Bearer ${tokenA}` },
        }),
      );
      assert.equal(expiredToken.status, 401);
      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: {
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: new Date(),
        },
      });
      const revokedToken = await getExtensionAccount(
        extensionRequest("/api/extension/me", {
          headers: { authorization: `Bearer ${tokenA}` },
        }),
      );
      assert.equal(revokedToken.status, 401);
      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: { revokedAt: null },
      });

      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: { extensionId: "a".repeat(32) },
      });
      const mismatched = await getExtensionAccount(
        extensionRequest("/api/extension/me", {
          headers: { authorization: `Bearer ${tokenA}` },
        }),
      );
      assert.equal(mismatched.status, 401);
      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: { extensionId: officialExtensionId },
      });
      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: { scopes: ["EXTENSION_JOBS_WRITE"] },
      });
      const missingAccountScope = await getExtensionAccount(
        extensionRequest("/api/extension/me", {
          headers: { authorization: `Bearer ${tokenA}` },
        }),
      );
      assert.equal(missingAccountScope.status, 401);
      await prisma.extensionConnection.update({
        where: { id: connectionA.id },
        data: {
          scopes: ["EXTENSION_JOBS_WRITE", "EXTENSION_ACCOUNT_READ"],
        },
      });

      const concurrentCode = generateExtensionSecret();
      const installationC = "c".repeat(43);
      await prisma.extensionAuthCode.create({
        data: {
          userId: user.id,
          codeHash: hashExtensionSecret(concurrentCode),
          redirectUri: officialRedirect,
          installationId: installationC,
          codeChallenge: validChallenge,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      const concurrentBody = JSON.stringify({
        grantType: "authorization_code",
        code: concurrentCode,
        codeVerifier: verifier,
        redirectUri: officialRedirect,
        installationId: installationC,
      });
      const concurrentResponses = await Promise.all([
        exchangeExtensionToken(
          extensionRequest("/api/extension/token", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: concurrentBody,
          }),
        ),
        exchangeExtensionToken(
          extensionRequest("/api/extension/token", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: concurrentBody,
          }),
        ),
      ]);
      assert.deepEqual(
        concurrentResponses.map(({ status }) => status).sort(),
        [200, 400],
      );

      const wrongVerifierCode = generateExtensionSecret();
      await prisma.extensionAuthCode.create({
        data: {
          userId: user.id,
          codeHash: hashExtensionSecret(wrongVerifierCode),
          redirectUri: officialRedirect,
          installationId: "d".repeat(43),
          codeChallenge: validChallenge,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      const wrongVerifier = await exchangeExtensionToken(
        extensionRequest("/api/extension/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            grantType: "authorization_code",
            code: wrongVerifierCode,
            codeVerifier: "w".repeat(43),
            redirectUri: officialRedirect,
            installationId: "d".repeat(43),
          }),
        }),
      );
      assert.equal(wrongVerifier.status, 400);
      await prisma.extensionAuthCode.delete({
        where: { codeHash: hashExtensionSecret(wrongVerifierCode) },
      });

      const expiredCode = generateExtensionSecret();
      await prisma.extensionAuthCode.create({
        data: {
          userId: user.id,
          codeHash: hashExtensionSecret(expiredCode),
          redirectUri: officialRedirect,
          installationId: "e".repeat(43),
          codeChallenge: validChallenge,
          expiresAt: new Date(Date.now() - 1),
        },
      });
      const expiredGrant = await exchangeExtensionToken(
        extensionRequest("/api/extension/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            grantType: "authorization_code",
            code: expiredCode,
            codeVerifier: verifier,
            redirectUri: officialRedirect,
            installationId: "e".repeat(43),
          }),
        }),
      );
      assert.equal(expiredGrant.status, 400);

      const payload = {
        title: "Extension Security Engineer",
        company: "JobHunter Test",
        location: "Jakarta",
        salary: null,
        source: "GLINTS",
        sourceUrl,
        description: "Captured from the active tab.",
        postedAt: null,
        employmentType: null,
        experience: null,
        education: null,
        category: null,
        recruiter: null,
        skills: ["TypeScript"],
        externalJobId: suffix,
        companyDetails: { website: "https://example.test" },
        forceSave: true,
      };
      // The capture path now applies AI match gating (needsCv/review/save).
      // Give the user a profile and force the save so the captured job is
      // still persisted and can be asserted below.
      await prisma.profile.create({
        data: { userId: user.id, skills: ["TypeScript"] },
      });
      const saved = await saveExtensionJob(
        extensionRequest("/api/extension/jobs", {
          method: "POST",
          headers: {
            authorization: `Bearer ${tokenA}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );
      assert.equal(saved.status, 200);

      const extensionJob = await prisma.job.findUniqueOrThrow({
        where: { dedupeKey: `extension:${user.id}:${sourceUrl}` },
      });
      const manualJob = await prisma.job.create({
        data: {
          scope: "PRIVATE",
          ownerId: user.id,
          dedupeKey: privateJobDedupeKey(user.id, sourceUrl),
          title: payload.title,
          company: payload.company,
          source: "GLINTS",
          sourceUrl,
          skills: [],
        },
      });
      assert.notEqual(extensionJob.id, manualJob.id);

      const oversized = await saveExtensionJob(
        extensionRequest("/api/extension/jobs", {
          method: "POST",
          headers: {
            authorization: `Bearer ${tokenA}`,
            "content-type": "application/json",
          },
          body: "x".repeat(64_001),
        }),
      );
      assert.equal(oversized.status, 413);
    } finally {
      await prisma.user.deleteMany({ where: { email } });
    }
  },
);

test(
  "extension jobs and credentials remain isolated by user",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const suffix = randomUUID();
    const emailA = `extension-a-${suffix}@example.test`;
    const emailB = `extension-b-${suffix}@example.test`;
    const sourceUrlA = `https://glints.com/id/jobs/extension-a-${suffix}`;
    const sourceUrlB = `https://jobstreet.co.id/id/job/${suffix}`;

    try {
      const [userA, userB] = await Promise.all([
        prisma.user.create({ data: { email: emailA } }),
        prisma.user.create({ data: { email: emailB } }),
      ]);
      const [extensionJobA, manualJobA, extensionJobB] = await Promise.all([
        prisma.job.create({
          data: {
            scope: "PRIVATE",
            ownerId: userA.id,
            dedupeKey: `extension:${userA.id}:${sourceUrlA}`,
            title: "Extension A",
            company: "A",
            source: "GLINTS",
            sourceUrl: sourceUrlA,
            skills: [],
          },
        }),
        prisma.job.create({
          data: {
            scope: "PRIVATE",
            ownerId: userA.id,
            dedupeKey: privateJobDedupeKey(userA.id, `${sourceUrlA}?manual=1`),
            title: "Manual A",
            company: "A",
            source: "GLINTS",
            sourceUrl: `${sourceUrlA}?manual=1`,
            skills: [],
          },
        }),
        prisma.job.create({
          data: {
            scope: "PRIVATE",
            ownerId: userB.id,
            dedupeKey: `extension:${userB.id}:${sourceUrlB}`,
            title: "Extension B",
            company: "B",
            source: "JOBSTREET",
            sourceUrl: sourceUrlB,
            skills: [],
          },
        }),
      ]);

      await prisma.savedJob.createMany({
        data: [
          { userId: userA.id, jobId: extensionJobA.id, origin: "EXTENSION" },
          { userId: userA.id, jobId: manualJobA.id, origin: "MANUAL" },
          { userId: userB.id, jobId: extensionJobB.id, origin: "EXTENSION" },
        ],
      });
      await prisma.extensionConnection.create({
        data: {
          userId: userA.id,
          installationId: `installation-${suffix}`,
          extensionId: "lokhjkfokakakehiojciicjhfokmkldg",
          tokenHash: `token-${suffix}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await prisma.extensionAuthCode.create({
        data: {
          userId: userA.id,
          codeHash: `code-${suffix}`,
          redirectUri: `https://${"a".repeat(32)}.chromiumapp.org/connected`,
          installationId: `auth-installation-${suffix}`,
          codeChallenge: "c".repeat(43),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      const [visibleA, visibleB] = await Promise.all([
        prisma.job.findMany({ where: extensionJobsWhere(userA.id) }),
        prisma.job.findMany({ where: extensionJobsWhere(userB.id) }),
      ]);
      assert.deepEqual(
        visibleA.map(({ id }) => id),
        [extensionJobA.id],
      );
      assert.deepEqual(
        visibleB.map(({ id }) => id),
        [extensionJobB.id],
      );

      await prisma.user.delete({ where: { id: userA.id } });
      assert.equal(
        await prisma.extensionConnection.findUnique({
          where: { tokenHash: `token-${suffix}` },
        }),
        null,
      );
      assert.equal(
        await prisma.extensionAuthCode.findUnique({
          where: { codeHash: `code-${suffix}` },
        }),
        null,
      );
    } finally {
      await prisma.user.deleteMany({
        where: { email: { in: [emailA, emailB] } },
      });
    }
  },
);
