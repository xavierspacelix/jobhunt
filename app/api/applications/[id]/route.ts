import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  applicationPatchSchema,
  resolveAppliedAt,
  toOptionalDate,
} from "@/lib/application-input";

export const runtime = "nodejs";

export const GET = auth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const email = req.auth?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const application = await prisma.application.findFirst({
      where: { id, user: { email } },
      include: { job: true },
    });
    if (!application) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ application });
  },
);

export const PATCH = auth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const email = req.auth?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const json = await req.json().catch(() => null);
    const parsed = applicationPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const existing = await prisma.application.findFirst({
      where: { id, user: { email } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
        appliedAt: resolveAppliedAt({
          currentStatus: existing.status,
          currentAppliedAt: existing.appliedAt,
          nextStatus: data.status,
          inputAppliedAt: data.appliedAt,
        }),
        nextFollowUpAt: toOptionalDate(data.nextFollowUpAt),
        coverLetter: data.coverLetter,
      },
      include: { job: true },
    });

    return NextResponse.json({ application: updated });
  },
);

export const DELETE = auth(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const email = req.auth?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const existing = await prisma.application.findFirst({
      where: { id, user: { email } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.application.delete({ where: { id } });
      const job = await tx.job.findFirst({
        where: {
          id: existing.jobId,
          scope: "PRIVATE",
          owner: { email },
          savedBy: { none: {} },
          applications: { none: {} },
          matches: { none: {} },
          recommendations: { none: {} },
        },
        select: { id: true },
      });
      if (job) await tx.job.delete({ where: { id: job.id } });
    });
    return NextResponse.json({ ok: true });
  },
);
