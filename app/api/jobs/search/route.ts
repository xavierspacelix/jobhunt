import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  parseKeywords,
  profileKeywords,
  runJobSearch,
  type SearchEvent,
} from "@/lib/job-search";
import { parseJobSearchInput } from "@/lib/job-search-input";
import { jobSearchRateLimit } from "@/lib/rate-limit";
import { parseTrustedJobPayload } from "@/lib/job-data";
import { signJobPreview } from "@/lib/job-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function readBody(req: Request): Promise<{
  keywords: unknown;
  location?: string;
} | null> {
  const body = await req
    .json()
    .then((value) => ({ success: true as const, value }))
    .catch(() => ({ success: false as const }));
  if (!body.success) return null;
  const json = body.value;
  const parsed = parseJobSearchInput(json);
  if (!parsed.success) return null;
  const keywords = parsed.data.keywords ?? parsed.data.query ?? [];
  const location = parsed.data.location?.trim() || undefined;
  return { keywords, location };
}

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!jobSearchRateLimit(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak pencarian, coba lagi nanti." },
      { status: 429 },
    );
  }
  if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) {
    return NextResponse.json(
      { error: "AI belum dikonfigurasi untuk pencarian rekomendasi." },
      { status: 503 },
    );
  }

  const body = await readBody(req);
  if (!body) {
    return NextResponse.json(
      { error: "Data pencarian tidak valid" },
      { status: 400 },
    );
  }
  let keywords = parseKeywords(body.keywords);
  if (keywords.length === 0) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        profile: { select: { skills: true, headline: true, experience: true } },
      },
    });
    keywords = profileKeywords(user?.profile ?? null);
  }
  if (keywords.length === 0) {
    return NextResponse.json(
      { error: "Masukkan kata kunci atau lengkapi skill di profil." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, profile: { select: { id: true } } },
  });
  if (!user) {
    return NextResponse.json(
      { error: "User tidak ditemukan" },
      { status: 401 },
    );
  }
  if (!user.profile) {
    return NextResponse.json(
      { error: "Lengkapi profil atau unggah CV dahulu." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: SearchEvent) => {
        let event: unknown;
        if (e.type === "result") {
          const trusted = parseTrustedJobPayload(e.job);
          if (!trusted.success) return;
          event = {
            ...e,
            job: {
              ...e.job,
              previewToken: signJobPreview(trusted.data, user.id, {
                match: e.match,
              }),
            },
          };
        } else {
          event = e;
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      try {
        send({ type: "start" });
        await runJobSearch(
          user.id,
          keywords,
          { location: body.location, maxAgeDays: 30, onlyOpen: true },
          send,
        );
      } catch (err) {
        console.error(
          "[job-search] search failed:",
          err instanceof Error ? err.name : "UnknownError",
        );
        send({
          type: "error",
          message: "Pencarian gagal. Coba lagi.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});
