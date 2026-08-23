import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatJson } from "@/lib/llm";
import { profileKeywords } from "@/lib/job-search";
import { parseKeywordRecommendation } from "@/lib/recommend-keywords";
import { recommendKeywordsRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface ExperienceEntry {
  role?: string;
  company?: string;
  period?: string;
}

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!recommendKeywordsRateLimit(email)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan rekomendasi, coba lagi nanti." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      profile: {
        select: {
          skills: true,
          headline: true,
          summary: true,
          experience: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = user.profile;
  if (!profile) {
    return NextResponse.json(
      { error: "Lengkapi profil atau unggah CV dahulu." },
      { status: 400 },
    );
  }

  let keywords: string[] = [];
  let summary = "";
  if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
    try {
      const system =
        "You are a career recommendation assistant for job seekers in Indonesia. Respond with STRICT JSON only, no prose.";
      const experienceText = Array.isArray(profile.experience)
        ? (profile.experience as ExperienceEntry[])
            .map((e) => e.role)
            .filter(Boolean)
            .join(", ")
        : "";
      const userPrompt = `Berdasarkan SELURUH profil kandidat (bukan hanya skill), usulkan maksimal 10 kata kunci pencarian lowongan (peran, skill, lokasi, atau tipe kerja seperti Remote) yang memaksimalkan kecocokan, serta ringkasan singkat (1-2 kalimat) dalam Bahasa Indonesia yang menjelaskan rekomendasinya.
Pertimbangkan headline, ringkasan, skill, DAN pengalaman kerja (termasuk peran lampau) untuk menangkap minat dan arah karier kandidat.
Kembalikan JSON dengan bentuk persis:
{ "keywords": string[], "summary": string }

Profil:
- Headline: ${profile.headline ?? ""}
- Summary: ${profile.summary ?? ""}
- Skills: ${(profile.skills ?? []).join(", ")}
- Pengalaman: ${experienceText || "(kosong)"}

Gunakan kata kunci seperti lazim di job board (Glints/Jobstreet), mis. "Frontend Developer", "React", "Jakarta", "Remote".`;

      const parsed = parseKeywordRecommendation(
        await callChatJson(system, userPrompt),
      );
      keywords = parsed.keywords;
      summary = parsed.summary;
    } catch (err) {
      console.error("[recommend-keywords] LLM gagal:", err);
    }
  }

  if (keywords.length === 0) {
    keywords = profileKeywords(profile);
    summary = `Rekomendasi dari profil Anda (skill, headline, & pengalaman): ${keywords.join(", ")}.`;
  }

  return NextResponse.json({ keywords, summary });
});
