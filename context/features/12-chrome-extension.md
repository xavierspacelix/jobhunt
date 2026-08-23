# Feature 12: Chrome Extension Safe Handoff

## Goal

Mempercepat pemindahan URL lowongan Glints/Jobstreet dari tab aktif ke alur
preview JobHunter tanpa memberi ekstensi kredensial atau akses tulis langsung.

## User Outcome

User mengunduh ekstensi dari dashboard, membuka lowongan Glints/Jobstreet, lalu
memilih **Buka di JobHunter**. JobHunter membuka tab input URL, mengambil preview,
dan tetap meminta user menekan **Simpan**.

## In Scope

- Ekstensi Chrome/Edge Manifest V3 dengan popup dan validasi tab aktif.
- Domain lowongan: `glints.com`, `jobstreet.co.id`, dan `jobstreet.com`, termasuk
  subdomain HTTPS.
- Base URL JobHunter dapat dikonfigurasi, default
  `https://jobhunt.spacelix.qzz.io`.
- Opsi deteksi `http://localhost:3000` melalui `GET /api/health`; kegagalan probe
  kembali ke base URL yang dikonfigurasi.
- Handoff membuka `/jobs?url=<encoded>&source=extension` di tab baru.
- `JobFetcher` mengonsumsi handoff satu kali, memilih tab input URL, mengisi URL,
  memulai preview yang sudah ada, lalu menghapus parameter handoff dari address bar.
- `GET /api/extension/download` membutuhkan session, mengisi
  `User.extensionDownloadedAt`, dan mengirim artefak ZIP.
- Tombol download dashboard menggunakan primitive `Button`, semantic token, serta
  state loading, success, dan error yang dapat dibaca assistive technology.

## Trust And Safety

- Tidak ada API direct-write, extension token, atau salinan session cookie.
- Extension hanya menyimpan preferensi base URL dan deteksi localhost melalui
  `chrome.storage.sync`.
- Preview memakai endpoint auth dan validasi URL Feature 03; penyimpanan tetap
  tindakan eksplisit user di web app.
- HTTP hanya diterima untuk `localhost`/`127.0.0.1`; target remote harus HTTPS.
- Parameter handoff yang bukan `source=extension` atau bukan URL portal yang
  didukung diabaikan.

## Acceptance Criteria

- [x] Popup menolak tab yang bukan lowongan Glints/Jobstreet.
- [x] Base URL dapat diubah dan opsi localhost gagal secara aman ke production/config.
- [x] Handoff membuka preview, bukan menyimpan Job secara langsung.
- [x] Refresh tidak mengulang handoff yang sudah dikonsumsi.
- [x] Download tanpa auth mengembalikan 401.
- [x] Download auth mengirim ZIP dengan header attachment dan mencatat timestamp.
- [x] Artefak dapat dibangun ulang tanpa dependency npm tambahan.
- [x] `unzip -t public/jobhunter-chrome-extension.zip` passes.

## Artifact

- Source: `browser-extension/`
- Download: `public/jobhunter-chrome-extension.zip`
- Generate: `bash scripts/build-extension.sh`

## Dependencies

- 01
- 03

## Out Of Scope

- Auto-apply, scraping di extension, content script, background polling, dan API
  yang menyimpan Job/Application langsung dari extension.
- Publikasi otomatis ke Chrome Web Store.

## Verification Status

Implementation and artifact gates pass. Chrome/Edge store publication and full
browser E2E are not claimed. The handoff is intentionally not a one-click save:
web authentication, server preview signing, user review, and explicit Save remain
mandatory.
