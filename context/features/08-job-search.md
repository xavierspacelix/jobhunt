# Feature 08: On-demand Job Search & Recommendations

Status: in progress (implementation complete; live environment verification pending)

## Goal

User menjalankan pencarian Glints/Jobstreet dari `/jobs`, meninjau scored result
previews, lalu secara eksplisit memilih hasil yang ingin disimpan.

## User Outcome

Tab `Cari (Scrape)` menyediakan keyword dan lokasi, saran keyword dari profil,
progress pencarian live, hasil dengan match score/skills, detail, dan tombol
simpan. Hasil yang disimpan muncul di tab `Tersimpan` dengan provenance manual,
search, atau both.

## In Scope

- UI dalam `JobFetcher`: tab Tersimpan, Input Manual (Link), dan Cari (Scrape).
- `POST /api/jobs/recommend-keywords` menghasilkan sampai 10 saran dari profil
  via LLM atau heuristic fallback.
- `POST /api/jobs/search` (auth, Node runtime, max duration 300s) streams SSE:
  `start|search|links|detail|result|done|error`.
- Input menerima sampai 10 normalized keywords; source search URL saat ini
  menggunakan lima keyword pertama per source.
- Search Glints lalu Jobstreet, deduplicate link, cap batch 20, interval 1.5s.
- Native fetch + Playwright fallback; retry 429 dengan delay 5/10/20 detik.
- Filter closed job, maximum age 30 hari, dan best-effort location matching.
- Parse detail dengan parser Feature 03, score candidate concurrency 4, lalu
  stream preview. Search tidak menulis database.
- Setiap result membawa preview HMAC 15 menit yang terikat user.
- `POST /api/jobs/recommendations` hanya menerima preview valid, lalu upsert
  SHARED Job, SavedJob SEARCH, Recommendation, dan optional Match.
- `GET /api/jobs` hanya mengembalikan Job yang memiliki relasi user aktif dan
  memberi origin manual/auto/both. Tidak ada `GET /api/jobs/recommended`.
- Docker/Compose tetap tanpa scheduler atau cron service.

## Out Of Scope

- Background cron/scheduler
- Automatic save semua search results
- Auto-apply bot

## Behavior and Safety

- Search harus dipicu user dan memberikan progress nyata.
- User memilih sendiri hasil yang disimpan; preview sementara hilang saat reload.
- Source-level fetch failures are reported and the next source can continue.
  Unexpected detail-parser or scoring exceptions currently bubble to the
  route-level `error` event and can stop the run.
- Shared canonical tidak dapat ditulis dari payload client unsigned. Unsaved Job
  tidak menghapus canonical atau data user lain.

## Acceptance Criteria

- [x] Tab Cari (Scrape) tersedia di `/jobs`
- [x] Keyword dan lokasi dapat diedit; profile suggestions tersedia
- [x] Progres dan candidate results ditampilkan live via SSE
- [x] Batch 20, interval 1.5s, dan 429 backoff diterapkan
- [x] User dapat membuka detail dan menyimpan candidate tertentu
- [x] Saved candidate membuat Job + Recommendation dan muncul di Tersimpan
- [x] Tidak ada cron route/script/service
- [x] Unit tests search/job normalization lulus
- [x] Preview signing, provenance, user visibility, and DB ownership integration
  controls pass automated tests
- [ ] Live E2E lulus pada deploy dengan DB dan akses Glints/Jobstreet nyata

## Dependencies

- 01, 02, 03, 05

## Decisions

- OD-010 superseded: user-triggered on-demand search replaces cron.
- Explicit preview-and-save is canonical; automatic recommendation ingestion is
  not implemented.
