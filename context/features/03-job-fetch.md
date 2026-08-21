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
- POST/GET /api/jobs (simpan/list), GET/DELETE /api/jobs/[id]
- Rich detail: parser ekstrak employmentType, experience, education, category,
  recruiter, skills, externalJobId, shareToken, companyRefId, companyDetails
  (JSON-LD `hiringOrganization` + fallback teks). Tersimpan di kolom Job baru
  (migrasi `job_detail_fields`).
- UI /jobs: paste URL -> preview detail lengkap (Job Core + Skills + Company
  Details, read-only) -> simpan; daftar tersimpan bisa dibuka detail & dihapus.

## Catatan Scope
- Browserbase ditolak (tidak tersedia di Indonesia). Diganti local headless
  browser (Playwright + Chromium lokal) — menyimpang dari aturan MVP
  "no Playwright", disetujui user karena 403 anti-bot. Playwright tetap untuk
  cron (Feature 08).

## Out Of Scope
- Auto-scrape cron (Feature 08)

## Acceptance Criteria
- [x] Paste URL Glints valid -> title/company/location/salary/description terisi
- [x] Jobstreet sama (termasuk gaji dari teks halaman bila tak ada di JSON-LD)
- [x] Salary terdeteksi dari JSON-LD `baseSalary` maupun teks DOM (Rp/IDR/$/juta)
- [x] Description mempertahankan paragraph (bukan flat jadi satu baris)
- [x] Unknown domain rejected 400
- [x] Parser unit tests dengan fixture HTML (11 tests)
- [x] Preview hasil scrape tampil detail lengkap (Job Core + Company Details)
- [x] Field baru (skills, type, experience, dll) tersimpan & bisa dilihat lagi
- [x] Lowongan tersimpan bisa dibuka detail & dihapus

## Dependencies
- 01
