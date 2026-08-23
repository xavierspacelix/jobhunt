# Feature 03: Job Fetch via Paste URL (Glints & Jobstreet)

## Goal
Paste URL Glints/Jobstreet → fetch & parse jadi Job terstruktur.

## User Outcome
User paste link di /jobs → detail lowongan muncul, bisa save.

## In Scope
- POST /api/jobs/fetch-url {url}
- Allowlist: glints.com, jobstreet.co.id/.com (reject other + SSRF block private IP)
- Render: native fetch (10s, header browser) dulu; failed/blocked response dapat
  fallback ke local headless browser (Playwright + Chromium). Parser murni cheerio
  `lib/scrapers/glints.ts`, `jobstreet.ts` (JSON-LD JobPosting + meta)
- Parsed previews carry a user-bound 15-minute HMAC token. Valid tokens refresh a
  SHARED canonical deduped by source URL; invalid tokens reject; unsigned/edited
  manual fallback is PRIVATE and deduped per user+URL.
- POST/GET /api/jobs (save/user-visible list), GET/DELETE `/api/jobs/[id]` where
  DELETE means user unsave and cannot cascade into another user's records
- Rich detail: parser ekstrak employmentType, experience, education, category,
  recruiter, skills, externalJobId, shareToken, companyRefId, companyDetails
  (JSON-LD `hiringOrganization` + fallback teks). Tersimpan di kolom Job baru
  (migrasi `job_detail_fields`).
- JobStreet: ekstrak via `data-automation` (title/company/location/industry/
  work-type/salary/login-gated/date→postedAt/description+qualifications).
- Glints: CSS-module (kelas ter-hash) → parser struktural: h1 (judul),
  `a[href*="/companies/"]` (perusahaan), breadcrumb (lokasi+ kategori),
  teks `:contains`-style (gaji/jenis/experience/education/recruiter),
  heading traversal untuk Skills/Deskripsi/Tentang Perusahaan/Alamat.
  Job ID + Share Token diambil dari URL
  (`/opportunities/jobs/{id}/share/{token}`).
- UI `/jobs`: paste URL -> editable structured preview/manual fallback -> explicit
  save; daftar user-visible bisa dibuka detail dan di-unsave.

## Catatan Scope
- Browserbase ditolak (tidak tersedia di Indonesia). Diganti local headless
  browser (Playwright + Chromium lokal), disetujui karena anti-bot dan halaman
  yang membutuhkan render. Implementasi ini juga direuse oleh Feature 08.

## Out Of Scope
- Background cron/scheduler

## Acceptance Criteria
- [x] Paste URL Glints valid -> title/company/location/salary/description terisi
- [x] Jobstreet sama (termasuk gaji dari teks halaman bila tak ada di JSON-LD)
- [x] Salary terdeteksi dari JSON-LD `baseSalary` maupun teks DOM (Rp/IDR/$/juta)
- [x] Description mempertahankan paragraph (bukan flat jadi satu baris)
- [x] Unknown domain rejected 400
- [x] Parser unit tests dengan fixture HTML (8 dedicated parser cases)
- [x] Preview hasil scrape tampil detail lengkap (Job Core + Company Details)
- [x] Field baru (skills, type, experience, dll) tersimpan & bisa dilihat lagi
- [x] Lowongan tersimpan bisa dibuka detail & dihapus
- [x] JobStreet via `data-automation`; Glints via selector struktural (h1/breadcrumb/heading)
- [x] Job ID (JobStreet) & Job ID + Share Token (Glints) diekstrak dari URL
- [x] Redirects remain HTTPS/same-source with native DNS pin per hop; browser
  fallback pins exact host and same-origin resources
- [x] Editable/unsigned fallback saves privately; shared refresh requires a valid
  current-user preview token

Fixture/parser and security tests pass. Live Glints/Jobstreet and deployed
Playwright behavior remain external verification, not claimed acceptance evidence.

## Dependencies
- 01
