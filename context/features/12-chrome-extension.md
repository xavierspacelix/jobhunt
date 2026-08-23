# Feature 12: Extension-Native Job Capture

## Goal

Memindahkan detail lowongan Glints/Jobstreet dari DOM tab aktif ke akun JobHunter
tanpa fetch portal dari server dan tanpa auto-apply.

## User Outcome

User mengunduh extension dari dashboard, membuka detail lowongan, menghubungkan
akun melalui login JobHunter, meninjau seluruh data yang akan ditulis di popup,
lalu menekan **Simpan ke JobHunter**. `/jobs` hanya menampilkan simpanan extension.

## In Scope

- Chrome/Edge Manifest V3 dengan `activeTab`, `scripting`, `storage`, dan `identity`.
- JSON-LD `JobPosting` diprioritaskan; meta dan DOM menjadi fallback.
- Popup menampilkan preview seluruh payload dan membutuhkan tindakan Save eksplisit.
- Login menggunakan `chrome.identity.launchWebAuthFlow` dan PKCE S256 dari
  service worker agar flow tetap hidup ketika popup kehilangan fokus.
- Satu installation ID acak per browser. Beberapa browser/laptop dapat terhubung
  bersamaan tanpa merotasi token instalasi lain.
- Dashboard selalu menampilkan download dan memakai `externally_connectable`
  handshake untuk mendeteksi extension resmi pada browser yang sedang dipakai.
- `GET /api/extension/connection` membedakan instalasi lokal dari jumlah koneksi
  server aktif. `extensionDownloadedAt` hanya telemetry, bukan status instalasi.
- `GET /api/jobs?origin=extension` memasok daftar `/jobs`; contract default
  `GET /api/jobs` tetap mencakup seluruh job visible untuk consumer lama.
- `GET /api/extension/download` membutuhkan session dan mengirim ZIP no-store.

## Trust And Safety

- Hanya extension ID resmi `lokhjkfokakakehiojciicjhfokmkldg` yang diizinkan.
- Authorization code di-hash, single-use, PKCE-bound, berlaku lima menit, dan satu
  flow terbaru per user. Token di-hash, diikat ke extension serta installation ID,
  memiliki scope write plus account-read untuk menampilkan tujuan akun, dan
  kedaluwarsa setelah 90 hari.
- Raw token dan installation ID hanya berada di `chrome.storage.local`. Extension
  rilis terkunci ke origin production; tidak ada setting koneksi manual.
- Direct-write hanya menerima HTTPS Glints/Jobstreet, payload strict maksimal 64 KB,
  field bounded, dan menyimpan PRIVATE Job milik user dengan origin `EXTENSION`.
- Dedupe extension terpisah dari manual provenance untuk URL yang sama.
- CORS hanya merefleksikan origin extension allowlisted; token/save endpoint
  memiliki rate limit sebelum lookup token serta limit per connection.
- Extension tidak menerima password/session cookie, tidak menyimpan Application,
  dan tidak menjalankan auto-apply atau polling portal.

## Acceptance Criteria

- [x] Popup menolak tab yang bukan detail Glints/Jobstreet.
- [x] Popup membaca DOM, menampilkan seluruh payload, dan hanya save setelah klik.
- [x] PKCE code ditolak saat replay, expired, verifier salah, atau origin salah.
- [x] Token lintas extension ditolak dan dua installation token tetap independen.
- [x] Payload invalid/oversized ditolak dan data tersimpan private/user-scoped.
- [x] Manual dan extension capture URL sama tidak menimpa provenance.
- [x] Dashboard download selalu tersedia dan membedakan local install/server status.
- [x] Revocation dashboard mencabut semua installation token user.
- [x] Artifact dibangun ulang tanpa dependency npm tambahan.
- [x] Build development terpisah menargetkan localhost tanpa mengekspos setting
  koneksi pada paket production.

## Artifact

- Source: `browser-extension/`
- Download: `public/jobhunter-chrome-extension.zip`
- Generate: `bash scripts/build-extension.sh`

## Dependencies

- 01
- 03
- 04
- 05

## Out Of Scope

- Auto-apply, pembuatan Application otomatis, background polling, dan native app.
- Publikasi otomatis ke Chrome Web Store.
- Deteksi extension pada browser atau laptop lain; browser hanya dapat handshake
  dengan extension pada browser yang sedang membuka dashboard.

## Verification Status

Static checks and PostgreSQL extension integration tests pass. Full browser E2E,
Chrome Web Store identity, and live Glints/Jobstreet selector verification remain
external release checks.
