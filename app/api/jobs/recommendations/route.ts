import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recommendationSaveRateLimit } from "@/lib/rate-limit";
import { verifyRecommendationPreview } from "@/lib/job-preview";
import { persistRecommendationPreview } from "@/lib/job-recommendation";

export const runtime = "nodejs";

const inputSchema = z.object({ previewToken: z.string().min(1).max(100000) });

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!recommendationSaveRateLimit(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak penyimpanan, coba lagi nanti." },
      { status: 429 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Preview lowongan tidak valid" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const preview = verifyRecommendationPreview(
    parsed.data.previewToken,
    user.id,
  );
  if (!preview) {
    return NextResponse.json(
      { error: "Preview lowongan kedaluwarsa atau tidak valid" },
      { status: 400 },
    );
  }
  const job = await persistRecommendationPreview(user.id, preview);

  if (!job) {
    return NextResponse.json(
      { error: "Profil berubah sejak pencarian. Jalankan pencarian ulang." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    job,
    scope: job.scope,
    matchScore: preview.match.score,
  });
});
