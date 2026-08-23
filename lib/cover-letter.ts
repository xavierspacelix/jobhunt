import { callChatJson } from "@/lib/llm";
import type { Job, Profile } from "@/lib/generated/prisma/client";
import { z } from "zod";

type ExperienceEntry = { role?: string; company?: string; period?: string };
type EducationEntry = { school?: string; degree?: string; period?: string };

const coverLetterLlmSchema = z
  .object({ coverLetter: z.string().trim().min(1) })
  .strict();

export function parseCoverLetterLlmOutput(value: unknown): string {
  return coverLetterLlmSchema.parse(value).coverLetter;
}

function buildProfileText(profile: Profile): string {
  const exp = Array.isArray(profile.experience)
    ? (profile.experience as ExperienceEntry[])
    : [];
  const edu = Array.isArray(profile.education)
    ? (profile.education as EducationEntry[])
    : [];
  return [
    profile.fullName ? `Nama: ${profile.fullName}` : "",
    profile.headline ? `Headline: ${profile.headline}` : "",
    profile.location ? `Lokasi: ${profile.location}` : "",
    profile.summary ? `Ringkasan: ${profile.summary}` : "",
    profile.skills?.length ? `Keahlian: ${profile.skills.join(", ")}` : "",
    exp.length
      ? `Pengalaman: ${exp
          .map((e) => [e.role, e.company, e.period].filter(Boolean).join(" | "))
          .join("; ")}`
      : "",
    edu.length
      ? `Pendidikan: ${edu
          .map((e) =>
            [e.school, e.degree, e.period].filter(Boolean).join(" | "),
          )
          .join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildJobText(job: Job): string {
  return [
    `Posisi: ${job.title}`,
    `Perusahaan: ${job.company}`,
    job.location ? `Lokasi: ${job.location}` : "",
    job.employmentType ? `Tipe: ${job.employmentType}` : "",
    job.experience ? `Pengalaman diminta: ${job.experience}` : "",
    job.skills?.length ? `Skill: ${job.skills.join(", ")}` : "",
    job.description ? `Deskripsi:\n${job.description.slice(0, 4000)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function heuristicCoverLetter(profile: Profile, job: Job): string {
  const name = profile.fullName || profile.email || "Saya";
  const summary =
    profile.summary?.trim() ||
    "Saya memiliki motivasi tinggi, kemampuan belajar yang cepat, dan komitmen untuk berkontribusi secara maksimal.";
  const skills = (profile.skills ?? []).join(", ") || "-";
  return `Yang terhormat Tim Rekrutmen ${job.company},

Dengan hormat,

Saya ${name}${profile.headline ? `, ${profile.headline}` : ""}, tertarik untuk melamar posisi ${job.title} di ${job.company}${job.location ? ` (${job.location})` : ""}.

${summary} Beberapa keahlian utama yang saya kuasai meliputi: ${skills}.

Saya antusias untuk membahas lebih lanjut bagaimana pengalaman saya dapat mendukung tim ${job.company}. Terima kasih atas waktu dan pertimbangannya.

Hormat saya,
${name}`;
}

export async function generateCoverLetter(
  profile: Profile,
  job: Job,
): Promise<string> {
  const profileText = buildProfileText(profile);
  const jobText = buildJobText(job);

  if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
    try {
      const system =
        'You are a professional cover letter writer helping Indonesian job seekers. Write a concise, formal cover letter in Bahasa Indonesia addressed to the hiring team. Use only facts present in the candidate profile and job details. Do not invent experience, skills, or metrics. Respond with STRICT JSON only, no prose, in this exact shape: {"coverLetter": string}.';
      const user = `Candidate profile:\n${profileText}\n\nJob:\n${jobText}\n\nWrite the cover letter and return it as JSON {"coverLetter": "..."}.`;
      return parseCoverLetterLlmOutput(await callChatJson(system, user));
    } catch (err) {
      console.error("[cover-letter] LLM failed, using heuristic", err);
    }
  }

  return heuristicCoverLetter(profile, job);
}
