import { chromium } from "playwright"

export type RenderResult = {
  html: string
  error: string | null
  method: "native" | "browser"
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
}

interface NativeResult {
  ok: boolean
  status: number
  html: string
  error: string | null
}

async function nativeFetch(url: string): Promise<NativeResult> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    })
    const html = res.ok ? await res.text() : ""
    return {
      ok: res.ok,
      status: res.status,
      html,
      error: res.ok ? null : `HTTP ${res.status}`,
    }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      html: "",
      error: e instanceof Error ? e.message : "Fetch gagal",
    }
  }
}

function looksBlocked(status: number, html: string): boolean {
  if (status !== 200) return true
  const lower = html.toLowerCase()
  return /just a moment|cf-chl|cf-browser-verification|cf-mitigated|enable javascript and cookies to continue|checking your browser|you have been blocked|have been blocked|sorry, you have been blocked|attention required|verify you are human|why am i seeing this|access denied|cloudflare/i.test(
    lower,
  )
}

async function renderLocalBrowser(url: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-infobars",
    ],
  })
  try {
    const context = await browser.newContext({
      userAgent: BROWSER_HEADERS["User-Agent"],
      locale: "id-ID",
      ignoreHTTPSErrors: true,
      viewport: { width: 1366, height: 768 },
    })
    // Mask the most common automation signals Cloudflare checks.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false })
      // @ts-expect-error - injected at runtime
      window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} }
    })
    await context.setExtraHTTPHeaders({
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua":
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 })
    } catch {
      // networkidle may never settle behind a challenge; keep going
    }
    await page.waitForTimeout(2500)
    return await page.content()
  } finally {
    await browser.close().catch(() => {})
  }
}

export async function fetchRenderedHtml(url: string): Promise<RenderResult> {
  const native = await nativeFetch(url)
  if (native.ok && !looksBlocked(native.status, native.html)) {
    return { html: native.html, error: null, method: "native" }
  }
  try {
    const html = await renderLocalBrowser(url)
    // Only treat the browser result as success if it isn't a block page.
    if (html && html.length > 0 && !looksBlocked(200, html)) {
      return {
        html,
        error: native.error
          ? `Fetch biasa gagal (${native.error}); menggunakan browser lokal`
          : null,
        method: "browser",
      }
    }
  } catch {
    // fall through to native result below
  }
  // Both attempts blocked (or browser failed): return empty so callers skip
  // instead of parsing a "Sorry, you have been blocked" page as a job.
  return {
    html: "",
    error: native.error ?? "Halaman diblokir (bot protection / Cloudflare)",
    method: native.ok ? "native" : "native",
  }
}
