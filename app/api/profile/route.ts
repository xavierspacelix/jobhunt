import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCvUrl } from "@/lib/storage";

export const runtime = "nodejs";

export const GET = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  const cvUrl = profile?.cvKey ? await getCvUrl(profile.cvKey) : null;

  return Response.json({ profile, cvUrl });
});
