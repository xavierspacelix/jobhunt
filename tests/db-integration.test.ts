import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";

import { prisma } from "../lib/db";

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
      assert.deepEqual(visibleA.map(({ id }) => id), [job.id]);
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
      await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    }
  },
);
