import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePdf } from "@/lib/cv-parse";
import { extractCv } from "@/lib/llm";
import { deleteCv, getCvUrl, saveCv } from "@/lib/storage";
import { hasPdfMagic } from "@/lib/pdf";
import { cvUploadRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 6 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return jsonError("Unauthorized", 401);
  }
  if (!cvUploadRateLimit(email)) {
    return jsonError("Terlalu banyak unggahan, coba lagi nanti.", 429);
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, profile: { select: { cvKey: true } } },
  });
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  const userId = user.id;

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return jsonError("Ukuran unggahan terlalu besar. Maksimal 5 MB.", 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Data unggahan tidak valid.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("File CV belum dipilih.", 400);
  }
  if (file.type !== "application/pdf") {
    return jsonError("Hanya file PDF yang dapat diunggah.", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Ukuran file terlalu besar. Maksimal 5 MB.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasPdfMagic(buffer)) {
    return jsonError("Isi file bukan PDF yang valid.", 400);
  }

  if (buffer.includes(Buffer.from("/Encrypt"))) {
    return jsonError("PDF terenkripsi belum didukung.", 400);
  }

  let rawText: string;
  try {
    rawText = await parsePdf(buffer);
  } catch {
    return jsonError("PDF tidak dapat dibaca.", 400);
  }

  if (!rawText || !rawText.trim()) {
    return jsonError(
      "PDF tidak memiliki teks yang dapat diekstrak. File mungkin berupa hasil pindai atau terenkripsi.",
      400,
    );
  }

  const { data, source } = await extractCv(rawText);
  const cvKey = await saveCv(userId, buffer);
  let cvUrl: string | null;
  let profile;
  try {
    cvUrl = await getCvUrl(cvKey);
    profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      rawText,
      fullName: data.fullName,
      headline: data.headline,
      location: data.location,
      email: data.email,
      phone: data.phone,
      skills: data.skills,
      summary: data.summary,
      experience: data.experience,
      education: data.education,
      certifications: data.certifications,
      links: data.links,
      cvKey,
      parsedWith: source,
    },
    create: {
      userId,
      rawText,
      fullName: data.fullName,
      headline: data.headline,
      location: data.location,
      email: data.email,
      phone: data.phone,
      skills: data.skills,
      summary: data.summary,
      experience: data.experience,
      education: data.education,
      certifications: data.certifications,
      links: data.links,
      cvKey,
      parsedWith: source,
    },
    });
  } catch (error) {
    await deleteCv(cvKey).catch(() => {});
    throw error;
  }

  if (user.profile?.cvKey && user.profile.cvKey !== cvKey) {
    await deleteCv(user.profile.cvKey).catch(() => {});
  }

  return Response.json({ profile, source, cvUrl });
});
