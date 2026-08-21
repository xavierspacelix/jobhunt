import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePdf } from "@/lib/cv-parse";
import { extractCv } from "@/lib/llm";
import { saveCv } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  const userId = user.id;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }
  if (file.type !== "application/pdf") {
    return jsonError("Only PDF files are allowed", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("File too large (max 5MB)", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.includes(Buffer.from("/Encrypt"))) {
    return jsonError("Encrypted PDFs are not supported", 400);
  }

  let rawText: string;
  try {
    rawText = await parsePdf(buffer);
  } catch {
    return jsonError("Could not read the PDF", 400);
  }

  if (!rawText || !rawText.trim()) {
    return jsonError(
      "PDF has no extractable text (maybe scanned or encrypted)",
      400,
    );
  }

  const { data, source } = await extractCv(rawText);
  const cvKey = await saveCv(userId, buffer);

  const profile = await prisma.profile.upsert({
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

  return Response.json({ profile, source });
});
