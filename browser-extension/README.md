# Job Hunter Chrome Extension

Ekstensi Manifest V3 untuk mengambil data lowongan langsung dari DOM tab aktif,
menampilkan preview lokal, lalu menyimpannya ke akun Job Hunter hanya setelah
pengguna menekan **Simpan ke Job Hunter**.

## Instalasi

1. Ekstrak `jobhunter-chrome-extension.zip`.
2. Buka `chrome://extensions` atau `edge://extensions`.
3. Aktifkan Developer mode, pilih Load unpacked, lalu pilih folder hasil ekstrak.
4. Buka halaman detail lowongan Glints atau Jobstreet dan klik ikon Job Hunter.

## Alur Penggunaan

1. Popup memastikan tab aktif adalah halaman detail lowongan yang didukung.
2. Ekstensi membaca JSON-LD `JobPosting` dan fallback DOM/meta pada tab aktif.
3. Preview tampil langsung di popup tanpa membuka dashboard atau aplikasi web.
4. Pilih **Hubungkan akun** untuk masuk melalui alur web Job Hunter dengan PKCE.
5. Tinjau preview, lalu pilih **Simpan ke Job Hunter** untuk menyimpan.

Token akses dan installation ID acak hanya disimpan di `chrome.storage.local`;
token tidak pernah ditempatkan di URL, log, atau sync storage. Login PKCE dijalankan
oleh service worker agar tidak terputus saat popup kehilangan fokus. Token diikat ke extension ID, installation ID, dan
origin penerbit, serta kedaluwarsa setelah 90 hari. Setiap browser/laptop memiliki
koneksi independen. Tombol **Putuskan** menghapus token lokal; dashboard dapat
mencabut semua koneksi server. Dashboard hanya dapat mendeteksi instalasi pada
browser yang sedang dipakai melalui handshake dengan extension ID resmi.

## Koneksi

Extension rilis terkunci ke `https://jobhunt.spacelix.qzz.io`; end user tidak perlu
dan tidak dapat mengatur URL backend. Development lokal membutuhkan manifest/build
development terpisah agar paket production tetap least-privilege. Jalankan
`yarn extension:dev`, lalu Load unpacked dari
`.artifacts/job-hunter-extension-dev`. Nonaktifkan extension production karena
keduanya memakai ID stabil yang sama.

## Batasan Parser

- Hanya detail lowongan Glints dan Jobstreet yang cocok dengan pola URL backend.
- JSON-LD rekursif diprioritaskan; fallback DOM bergantung pada selector portal
  yang dapat berubah sewaktu-waktu.
- Konten dinamis yang belum masuk DOM saat popup dibuka mungkin tidak terambil.
- Ekstensi tidak menjalankan script atau HTML dari halaman. Deskripsi menjadi teks
  biasa dan seluruh string/array dipotong sesuai batas payload backend.
