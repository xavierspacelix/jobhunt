# Feature 03: Job Fetch via Paste URL (Glints & Jobstreet)

## Goal
Paste URL Glints/Jobstreet → fetch & parse jadi Job terstruktur.

## User Outcome
User paste link di /jobs → detail lowongan muncul, bisa save.

## In Scope
- POST /api/jobs/fetch-url {url}
- Allowlist: glints.com, jobstreet.co.id/.com (reject other + SSRF block private IP)
- fetch 10s timeout + cheerio parsers `lib/scrapers/glints.ts`, `jobstreet.ts` (pure)
- Job dedup by sourceUrl, manual fallback form jika parse gagal
- GET /api/jobs, /api/jobs/[id]

## Out Of Scope
- Auto-scrape cron (Feature 08), Playwright

## Acceptance Criteria
- [ ] Paste URL Glints valid -> title/company/description terisi
- [ ] Jobstreet sama
- [ ] Unknown domain rejected 400
- [ ] Parser unit tests dengan fixture HTML

## Dependencies
- 01
