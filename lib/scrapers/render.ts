import http from "node:http";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";
import zlib from "node:zlib";
import { chromium } from "playwright";
import {
  assertSafeScraperUrl,
  resolveSafeScraperUrl,
  scraperSourceForHostname,
  validateScraperUrl,
  type PinnedUrl,
} from "@/lib/ssrf";

export type RenderResult = {
  html: string;
  error: string | null;
  method: "native" | "browser";
};

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
};

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 10;

interface NativeResult {
  ok: boolean;
  status: number;
  html: string;
  error: string | null;
}

interface PinnedResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

type ResolvePinnedUrl = typeof resolveSafeScraperUrl;
type PinnedTransport = (target: PinnedUrl) => Promise<PinnedResponse>;

function collectBody(
  stream: NodeJS.ReadableStream,
  maximumBytes: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maximumBytes) {
        reject(new Error("Response body too large"));
        if ("destroy" in stream && typeof stream.destroy === "function") {
          stream.destroy();
        }
        return;
      }
      chunks.push(buffer);
    });
    stream.once("end", () => resolve(Buffer.concat(chunks, size)));
    stream.once("error", reject);
  });
}

async function decodeBody(
  body: Buffer,
  encodingHeader?: string,
): Promise<string> {
  const encoding = encodingHeader?.split(",")[0].trim().toLowerCase();
  let stream: NodeJS.ReadableStream = Readable.from(body);
  if (encoding === "gzip" || encoding === "x-gzip") {
    stream = stream.pipe(zlib.createGunzip());
  } else if (encoding === "deflate") {
    stream = stream.pipe(zlib.createInflate());
  } else if (encoding === "br") {
    stream = stream.pipe(zlib.createBrotliDecompress());
  } else if (encoding && encoding !== "identity") {
    throw new Error("Unsupported content encoding");
  }
  return (await collectBody(stream, MAX_RESPONSE_BYTES)).toString("utf8");
}

async function requestPinned(target: PinnedUrl): Promise<PinnedResponse> {
  const client = target.url.protocol === "https:" ? https : http;
  return await new Promise((resolve, reject) => {
    const request = client.request(
      {
        protocol: target.url.protocol,
        hostname: target.url.hostname,
        port: target.url.port || undefined,
        path: `${target.url.pathname}${target.url.search}`,
        method: "GET",
        headers: BROWSER_HEADERS,
        agent: false,
        family: target.family,
        servername: net.isIP(target.url.hostname)
          ? undefined
          : target.url.hostname,
        lookup: (_hostname, _options, callback) => {
          callback(null, target.address, target.family);
        },
      },
      async (response) => {
        try {
          const body = await collectBody(response, MAX_RESPONSE_BYTES);
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body,
          });
        } catch (error) {
          reject(error);
        }
      },
    );
    const timer = setTimeout(() => {
      request.destroy(new Error("Request timed out"));
    }, REQUEST_TIMEOUT_MS);
    timer.unref();
    request.once("close", () => clearTimeout(timer));
    request.once("error", reject);
    request.end();
  });
}

export async function nativeFetch(
  url: string,
  resolvePinned: ResolvePinnedUrl = resolveSafeScraperUrl,
  transport: PinnedTransport = requestPinned,
): Promise<NativeResult> {
  try {
    let current = await resolvePinned(url);
    const source = scraperSourceForHostname(current.url.hostname);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const response = await transport(current);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationValue = response.headers.location;
        const location = Array.isArray(locationValue)
          ? locationValue[0]
          : locationValue;
        if (!location || redirects === MAX_REDIRECTS) {
          throw new Error("Redirect blocked");
        }
        const next = await resolvePinned(location, current.url.href);
        if (scraperSourceForHostname(next.url.hostname) !== source) {
          throw new Error("Cross-source redirect blocked");
        }
        current = next;
        continue;
      }
      const ok = response.status >= 200 && response.status < 300;
      const encodingValue = response.headers["content-encoding"];
      const encoding = Array.isArray(encodingValue)
        ? encodingValue[0]
        : encodingValue;
      const html = ok ? await decodeBody(response.body, encoding) : "";
      return {
        ok,
        status: response.status,
        html,
        error: ok ? null : `HTTP ${response.status}`,
      };
    }
    throw new Error("Too many redirects");
  } catch (e) {
    return {
      ok: false,
      status: 0,
      html: "",
      error: e instanceof Error ? e.message : "Fetch gagal",
    };
  }
}

export function isAllowedBrowserRequest(
  initialUrl: URL,
  value: string,
): boolean {
  try {
    return validateScraperUrl(value).origin === initialUrl.origin;
  } catch {
    return false;
  }
}

function chromiumResolverRule(hostname: string, address: string): string {
  const destination = net.isIP(address) === 6 ? `[${address}]` : address;
  return `MAP ${hostname} ${destination}, MAP * ~NOTFOUND`;
}

function looksBlocked(status: number, html: string): boolean {
  if (status !== 200) return true;
  const lower = html.toLowerCase();
  // N.B. Do NOT match the bare word "cloudflare": legitimate job pages (Glints,
  // Jobstreet) embed Cloudflare CDN scripts/links in their HTML, which would
  // otherwise be misclassified as a block page. Only challenge markers count.
  return /just a moment|cf-chl|cf-browser-verification|cf-mitigated|enable javascript and cookies to continue|checking your browser|you have been blocked|have been blocked|sorry, you have been blocked|attention required|verify you are human|why am i seeing this|access denied/i.test(
    lower,
  );
}

async function renderLocalBrowser(url: string): Promise<string> {
  const initial = await resolveSafeScraperUrl(url);
  const browser = await chromium.launch({
    headless: true,
    chromiumSandbox: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-infobars",
      `--host-resolver-rules=${chromiumResolverRule(initial.url.hostname, initial.address)}`,
    ],
  });
  try {
    const context = await browser.newContext({
      userAgent: BROWSER_HEADERS["User-Agent"],
      locale: "id-ID",
      serviceWorkers: "block",
      viewport: { width: 1366, height: 768 },
    });
    await context.routeWebSocket("**/*", (webSocket) => {
      webSocket.close({ code: 1008, reason: "Blocked by SSRF policy" });
    });
    await context.route("**/*", async (route) => {
      if (isAllowedBrowserRequest(initial.url, route.request().url())) {
        await route.continue();
      } else {
        await route.abort("blockedbyclient");
      }
    });
    // Mask the most common automation signals Cloudflare checks.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      // @ts-expect-error - injected at runtime
      window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    });
    await context.setExtraHTTPHeaders({
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua":
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    });
    const page = await context.newPage();
    await page.goto(initial.url.href, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const navigatedUrl = await assertSafeScraperUrl(page.url());
    if (navigatedUrl.origin !== initial.url.origin) {
      throw new Error("Cross-origin navigation blocked");
    }
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch {
      // networkidle may never settle behind a challenge; keep going
    }
    await page.waitForTimeout(2500);
    const finalUrl = await assertSafeScraperUrl(page.url());
    if (finalUrl.origin !== initial.url.origin) {
      throw new Error("Cross-origin navigation blocked");
    }
    const html = await page.content();
    if (Buffer.byteLength(html) > MAX_RESPONSE_BYTES) {
      throw new Error("Response body too large");
    }
    return html;
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function fetchRenderedHtml(url: string): Promise<RenderResult> {
  const native = await nativeFetch(url);
  if (native.ok && !looksBlocked(native.status, native.html)) {
    return { html: native.html, error: null, method: "native" };
  }
  try {
    const html = await renderLocalBrowser(url);
    // Only treat the browser result as success if it isn't a block page.
    if (html && html.length > 0 && !looksBlocked(200, html)) {
      return {
        html,
        error: native.error
          ? `Fetch biasa gagal (${native.error}); menggunakan browser lokal`
          : null,
        method: "browser",
      };
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
  };
}
