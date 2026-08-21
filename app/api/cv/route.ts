import { auth } from "@/lib/auth";
import { readLocalCv } from "@/lib/storage";

export const runtime = "nodejs";

export const GET = auth(async (req) => {
  if (!req.auth?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = new URL(req.url).searchParams.get("key");
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const buffer = await readLocalCv(key);
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
