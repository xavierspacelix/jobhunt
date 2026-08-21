import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCvUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const cvUrl = profile?.cvKey ? await getCvUrl(profile.cvKey) : null;

  return Response.json({ profile, cvUrl });
}
