import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

export const runtime = "nodejs";

const DEBUG_AI_TEST = process.env.NODE_ENV !== "production";

const schema = z.object({
  baseUrl: z.string().trim().url().max(500).optional(),
  apiKey: z.string().trim().min(1).max(2000).optional(),
  model: z.string().trim().max(200).optional(),
});

export const POST = auth(async (req) => {
  const email = req.auth?.user?.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Input tidak valid." },
      { status: 400 },
    );
  }
  const { baseUrl: bU, apiKey: aK, model: mU } = parsed.data;

  let apiKey = aK || undefined;
  let baseUrl = (bU ?? "").replace(/\/$/, "") || undefined;
  let model = mU || undefined;

  if (!apiKey || !baseUrl) {
    const prof = await prisma.profile.findFirst({
      where: { user: { email } },
      select: { llmApiKey: true, llmBaseUrl: true, llmModel: true },
    });
    if (!apiKey && prof?.llmApiKey) {
      apiKey = decryptSecret(prof.llmApiKey) ?? undefined;
    }
    if (!baseUrl && prof?.llmBaseUrl) baseUrl = prof.llmBaseUrl;
    if (!model && prof?.llmModel) model = prof.llmModel;
  }

  if (!apiKey || !baseUrl) {
    return NextResponse.json({
      ok: false,
      error:
        "Konfigurasi AI belum lengkap. Isi Base URL & API Key terlebih dahulu.",
    });
  }
  model = model || "gpt-4o-mini";

  try {
    const endpoint = `${baseUrl}/chat/completions`;
    if (DEBUG_AI_TEST) {
      console.log("[ai-test:request]", {
        endpoint,
        model,
        auth: `Bearer ${apiKey.slice(0, 4)}…(redacted)`,
      });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 5,
        messages: [{ role: "user", content: "Reply with exactly the word: ok" }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const rawText = await res.text().catch(() => "");
    if (DEBUG_AI_TEST) {
      console.log("[ai-test:response]", {
        status: res.status,
        body: rawText.slice(0, 500),
      });
    }

    const json = (() => {
      try {
        return JSON.parse(rawText) as {
          error?: { message?: string } | string;
          choices?: {
            message?: {
              content?: string | null;
              reasoning?: string | null;
              reasoning_content?: string | null;
            };
          }[];
        };
      } catch {
        return null;
      }
    })();

    if (!res.ok || json?.error) {
      const providerError =
        typeof json?.error === "string"
          ? json.error
          : json?.error?.message ?? "";
      return NextResponse.json({
        ok: false,
        error: `LLM merespons ${res.status}.${
          providerError ? " " + providerError.slice(0, 200) : ""
        }${!providerError && rawText ? " " + rawText.slice(0, 200) : ""}`,
      });
    }

    const message = json?.choices?.[0]?.message;
    const content =
      typeof message?.content === "string" && message.content.length > 0
        ? message.content
        : message?.reasoning ?? message?.reasoning_content ?? null;

    if (typeof content === "string" && content.length > 0) {
      return NextResponse.json({ ok: true, model });
    }

    // Request succeeded but the model returned empty/null content (some
    // reasoning-only models do this). Treat the connection as valid.
    return NextResponse.json({
      ok: true,
      model,
      warning:
        "Terhubung, tetapi model mengembalikan respons kosong. Pastikan model mendukung chat completion standar.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: `Gagal menghubungi LLM: ${message}`,
    });
  }
});
