import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatJson } from "@/lib/llm";
import { parseKeywordRecommendation } from "@/lib/recommend-keywords";
import { recommendKeywordsRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

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
          education: true,
          certifications: true,
          location: true,
          rawText: true,
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
  if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) {
    return NextResponse.json(
      { error: "AI belum dikonfigurasi untuk pencarian rekomendasi." },
      { status: 503 },
    );
  }

  try {
    const system =
      "You are a career recommendation assistant for job seekers in Indonesia. Respond with STRICT JSON only, no prose.";
    const experienceText = Array.isArray(profile.experience)
      ? JSON.stringify(profile.experience).slice(0, 8000)
      : "";
    const educationText = Array.isArray(profile.education)
      ? JSON.stringify(profile.education).slice(0, 8000)
      : "";
    const certificationText = Array.isArray(profile.certifications)
      ? JSON.stringify(profile.certifications).slice(0, 4000)
      : "";
    const userPrompt = `Berdasarkan SELURUH profil kandidat, usulkan maksimal 5 kata kunci berupa NAMA POSISI atau PERAN yang lazim dipakai di Glints/Jobstreet dan paling mungkin menghasilkan kecocokan tinggi. Jangan masukkan lokasi, tipe kerja, atau skill tunggal sebagai kata kunci. Berikan ringkasan singkat (1-2 kalimat) dalam Bahasa Indonesia.
Pertimbangkan headline, ringkasan, skill, pengalaman kerja, pendidikan, dan lokasi kandidat.
Kembalikan JSON dengan bentuk persis:
{ "keywords": string[], "summary": string }

Profil:
- Headline: ${profile.headline ?? ""}
- Summary: ${profile.summary ?? ""}
- Skills: ${(profile.skills ?? []).join(", ")}
- Pengalaman: ${experienceText || "(kosong)"}
- Pendidikan: ${educationText || "(kosong)"}
- Sertifikasi: ${certificationText || "(kosong)"}
- Lokasi: ${profile.location ?? ""}
- Teks CV: ${(profile.rawText ?? "").slice(0, 8000)}

Contoh bentuk kata kunci: "Frontend Developer", "Backend Engineer", atau "Full Stack Developer".`;

    const parsed = parseKeywordRecommendation(
      await callChatJson(system, userPrompt),
    );
    return NextResponse.json({
      keywords: parsed.keywords,
      summary: parsed.summary,
      location: profile.location ?? "",
    });
  } catch (err) {
    console.error("[recommend-keywords] LLM gagal:", err);
    return NextResponse.json(
      { error: "AI gagal menyusun strategi pencarian. Coba lagi." },
      { status: 502 },
    );
  }
});
