# Feature 03: Job Fetch via Paste URL (Glints & Jobstreet)

## Goal
Paste URL Glints/Jobstreet → fetch & parse jadi Job terstruktur.

## User Outcome
User paste link di /jobs → detail lowongan muncul, bisa save.

## In Scope
- POST /api/jobs/fetch-url {url}
- Allowlist: glints.com, jobstreet.co.id/.com (reject other + SSRF block private IP)
- Render: native fetch (10s, header browser) dulu; fallback ke local headless
  browser (Playwright + Chromium) bila 403/Cloudflare. Parser murni cheerio
  `lib/scrapers/glints.ts`, `jobstreet.ts` (JSON-LD JobPosting + meta)
- Job dedup by sourceUrl, manual fallback form jika parse gagal
- POST/GET /api/jobs (simpan/list), GET /api/jobs/[id]
- UI /jobs: paste URL -> form terisi -> simpan + daftar tersimpan

## Catatan Scope
- Browserbase ditolak (tidak tersedia di Indonesia). Diganti local headless
  browser (Playwright + Chromium lokal) — menyimpang dari aturan MVP
  "no Playwright", disetujui user karena 403 anti-bot. Playwright tetap untuk
  cron (Feature 08).

## Out Of Scope
- Auto-scrape cron (Feature 08), Playwright

## Acceptance Criteria
- [ ] Paste URL Glints valid -> title/company/description terisi
- [ ] Jobstreet sama
- [ ] Unknown domain rejected 400
- [ ] Parser unit tests dengan fixture HTML

## Dependencies
- 01
