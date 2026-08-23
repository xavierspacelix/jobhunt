import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

const EXTENSION_FILENAME = "jobhunter-chrome-extension.zip"

export const GET = auth(async (request) => {
  const email = request.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const artifact = await readFile(
      path.join(process.cwd(), "public", EXTENSION_FILENAME),
    )

    await prisma.user.update({
      where: { email },
      data: { extensionDownloadedAt: new Date() },
    }).catch(() => undefined)

    return new Response(new Uint8Array(artifact), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${EXTENSION_FILENAME}"`,
        "Content-Length": String(artifact.byteLength),
        "Content-Type": "application/zip",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Extension artifact unavailable" },
      { status: 500 },
    )
  }
})
