import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { parseKeywords, profileKeywords, runJobSearch, type SearchEvent } from "@/lib/job-search"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

async function readBody(req: Request): Promise<{
  keywords: string[] | null
  location?: string
}> {
  const json = await req.json().catch(() => null)
  if (!json) return { keywords: [] }
  const keywords = Array.isArray(json.keywords)
    ? json.keywords
    : typeof json.keywords === "string"
      ? json.keywords
      : typeof json.query === "string"
        ? json.query
        : []
  const location =
    typeof json.location === "string" ? json.location.trim() || undefined : undefined
  return { keywords, location }
}

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await readBody(req)
  let keywords = parseKeywords(body.keywords)
  if (keywords.length === 0) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { profile: { select: { skills: true, headline: true, experience: true } } },
    })
    keywords = profileKeywords(user?.profile ?? null)
  }
  if (keywords.length === 0) {
    return NextResponse.json(
      { error: "Masukkan kata kunci atau lengkapi skill di profil." },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: SearchEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`))
      try {
         send({ type: "start" })
        await runJobSearch(
          user.id,
          keywords,
          { location: body.location, maxAgeDays: 30, onlyOpen: true },
          send,
        )
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Pencarian gagal",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
})
