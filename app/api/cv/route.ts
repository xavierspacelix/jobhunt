import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readLocalCv } from "@/lib/storage";

export const runtime = "nodejs";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await prisma.profile.findFirst({
    where: { user: { email: req.auth.user.email } },
    select: { cvKey: true },
  });
  if (!profile?.cvKey) return new Response("Not found", { status: 404 });

  const buffer = await readLocalCv(profile.cvKey);
  if (!buffer) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "inline",
    },
  });
});
