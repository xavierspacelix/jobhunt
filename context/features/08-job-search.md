# Feature 08: On-demand Job Search & Recommendations

Status: in progress (implementation complete; live environment verification pending)

## Goal

User menjalankan pencarian Glints/Jobstreet dari `/jobs`, termasuk rekomendasi
high-score berbasis seluruh CV, meninjau scored result previews, lalu secara
eksplisit memilih hasil yang ingin disimpan.

## User Outcome

Tab `Cari (Scrape)` menyediakan pencarian rekomendasi satu klik dari CV, keyword
dan lokasi yang tetap editable, progress pencarian live, hasil AI berperingkat
dengan skor minimal 70, detail, dan tombol simpan. Hasil yang disimpan muncul di
tab `Tersimpan` dengan provenance manual, search, atau both.

## In Scope

- UI dalam `JobFetcher`: tab Tersimpan, Input Manual (Link), dan Cari (Scrape).
- `POST /api/jobs/recommend-keywords` memakai LLM untuk menghasilkan sampai lima
  nama posisi/peran dari headline, summary, skills, experience, education, dan
  certifications, location, serta raw CV text yang dibatasi. Flow rekomendasi
  tidak memakai heuristic fallback.
- `POST /api/jobs/search` (auth, Node runtime, max duration 300s) streams SSE:
  `start|search|links|detail|result|done|error`.
- Input menerima sampai 10 normalized keywords; source search URL menggunakan
  lima keyword pertama dan maksimum dua result pages per keyword/source.
- Search Glints lalu Jobstreet, deduplicate link, cap 30 detail dengan target
  seimbang 15/source dan backfill, interval 1.5s.
- Native fetch + Playwright fallback; retry 429 dengan delay 5/10/20 detik.
- Filter closed job, maximum age 30 hari, dan best-effort location matching.
- Parse detail dengan parser Feature 03, score maksimal 30 candidate via LLM-only
  dengan concurrency 4 dan timeout 25 detik/candidate, omit kegagalan per
  candidate, filter skor di bawah 70, sort descending, lalu stream preview.
  Search tidak menulis database.
- Setiap result membawa preview HMAC 15 menit yang mengikat user, job payload,
  hasil AI, dan revisi Profile sehingga save tidak perlu menilai ulang atau
  mempercayai score dari client. Profile yang berubah memaksa pencarian ulang.
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
- Flow rekomendasi memerlukan konfigurasi LLM; jika unavailable, API memberi
  error eksplisit dan tidak mengganti score dengan heuristic.
- Search membedakan empty success, partial source/AI failure, dan full failure.
  Stream yang selesai tanpa terminal event dilaporkan sebagai interrupted search.
  Internal errors memakai pesan client generik; qualified payload yang gagal
  trusted validation di-omit dan dihitung sebagai partial warning.
  Semua writes saat save (Job, SavedJob, Recommendation, Match) berada dalam satu
  transaction.
- Source-level fetch failures are reported and the next source can continue.
  Unexpected detail-parser or scoring exceptions currently bubble to the
  route-level `error` event and can stop the run.
- Shared canonical tidak dapat ditulis dari payload client unsigned. Unsaved Job
  tidak menghapus canonical atau data user lain.

## Acceptance Criteria

- [x] Tab Cari (Scrape) tersedia di `/jobs`
- [x] Keyword dan lokasi dapat diedit; profile suggestions tersedia
- [x] Satu aksi menghasilkan strategi pencarian dari seluruh CV dan memulai search
- [x] Progres dan candidate results ditampilkan live via SSE
- [x] Dua result pages/keyword, batch 30 seimbang, interval 1.5s, dan 429 backoff diterapkan
- [x] Hanya AI score >=70 ditampilkan descending; kegagalan candidate di-omit
- [x] Full/partial source dan AI failure memiliki state yang jujur
- [x] Signed score terikat Profile revision dan save bersifat atomic
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
- High-score recommendation adalah AI-only. Tidak ada heuristic score dalam flow
  ini; maksimum 30 detail menjaga load portal, biaya, dan durasi tetap bounded.
