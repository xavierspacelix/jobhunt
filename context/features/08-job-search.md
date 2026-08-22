# Feature 08: On-demand Job Search & Recommendations

Status: in progress (reimplemented without cron — on-demand from Lowongan page)

## Goal

User mengetik kata kunci → sistem cari di Glints & Jobstreet → simpan hasil ke
tab "Rekomendasi Untukmu". Berjalan **on-demand** saat user men-trigger dari UI,
bukan cron background.

## User Outcome

Section "Cari Lowongan" di `/jobs` dengan input kata kunci (bisa lebih dari
skill profil — mis. "React, Jakarta, Remote"). Saat mencari, user melihat
**proses nyata** (bukan spinner doang): "Mencari di Glints…", "34 lowongan
ditemukan", "Mengambil detail 12/20", "Disimpan: …", "Selesai — N disimpan".

## In Scope

- Section tersendiri di `/jobs` (`JobFetcher`): input kata kunci + panel progres
  live + hitungan tersimpan. Prefill dari `Profile.skills`.
- API `POST /api/jobs/search` (auth, `runtime=nodejs`, SSE `text/event-stream`):
  stream event `{type: start|search|links|detail|saved|done|error}`.
- Pipeline `lib/job-search.ts` (refactor dari cron lama, tanpa scheduler):
  - Keyword = input user (top 10, bukan cuma 5 skill profil).
  - Search Glints (`/id/opportunities/jobs/explore?keyword=`) + Jobstreet
    (`/en/job-search?key=`) via `buildSearchUrls`.
  - Parse search-result links → fetch detail (reuse `parseGlints`/`parseJobstreet`)
    → upsert `Job` (by sourceUrl) + buat `Recommendation` per user.
  - Batch 20 per run; 429 exponential backoff (base 5s, 3 retry); `MIN_INTERVAL_MS=1500`.
  - Fallback render: `fetchRenderedHtml` (native → Playwright bila 403/Cloudflare).
- UI tab "Rekomendasi Untukmu" via `GET /api/jobs/recommended` (sudah ada,
  sekarang terisi oleh pencarian on-demand).
- Docker: `Dockerfile` + `docker-compose.yml` (`web` + `dev`, Traefik). **Tidak ada
  service cron.** Job search on-demand dari UI.

## Out Of Scope

- Cron / scheduler background (dibatalkan per keputusan user).
- Auto-apply bot; MVP blocking lainnya.

## Acceptance Criteria

- [x] Section "Cari Lowongan" ada di `/jobs` dengan input kata kunci
- [x] Progres pencarian ditampilkan live (bukan loading state saja)
- [x] Keyword fleksibel (bukan cuma skill profil)
- [x] Hasil masuk ke tab "Rekomendasi Untukmu"
- [x] Batch 20 + 429 backoff
- [x] Tanpa service cron di compose

## Dependencies

- 01, 02, 03

## Decisions

- Cron dibatalkan (OD-010 kini superseded) — pencarian on-demand dari UI.
- Lihat `library-docs.md` (tidak ada lagi Cron scheduler).
