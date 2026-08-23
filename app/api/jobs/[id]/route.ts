import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jobVisibilityWhere } from "@/lib/job-data";

export const runtime = "nodejs";

export const GET = auth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const email = req.auth?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: {
        id,
        ...jobVisibilityWhere(user.id),
      },
    });
    if (!job) {
      return NextResponse.json(
        { error: "Lowongan tidak ditemukan" },
        { status: 404 },
      );
    }
    return NextResponse.json({ job });
  },
);

export const DELETE = auth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const email = req.auth?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const existing = await prisma.job.findFirst({
      where: {
        id,
        ...jobVisibilityWhere(user.id),
      },
      select: {
        scope: true,
        ownerId: true,
        savedBy: { where: { userId: user.id }, select: { id: true } },
        applications: { where: { userId: user.id }, select: { id: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }
    const hasApplication = existing.applications.length > 0;
    const jobDeleted = await prisma.$transaction(async (tx) => {
      await tx.savedJob.deleteMany({ where: { userId: user.id, jobId: id } });
      await tx.recommendation.deleteMany({
        where: { userId: user.id, jobId: id },
      });
      if (!hasApplication) {
        await tx.match.deleteMany({ where: { userId: user.id, jobId: id } });
      }
      if (
        existing.scope === "PRIVATE" &&
        existing.ownerId === user.id &&
        !hasApplication
      ) {
        await tx.job.delete({ where: { id } });
        return true;
      }
      return false;
    });
    return NextResponse.json({
      ok: true,
      removed: existing.savedBy.length > 0,
      retainedForApplication: hasApplication,
      retainedState: hasApplication
        ? "APPLICATION"
        : existing.scope === "SHARED"
          ? "SHARED_CANONICAL"
          : null,
      jobDeleted,
    });
  },
);
