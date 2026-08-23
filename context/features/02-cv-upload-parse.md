# Feature 02: CV Upload & Parse (PDF)

## Goal
User upload PDF CV → sistem ekstrak profil kandidat (alaglints-style) → simpan sebagai
Profile → user bisa edit hasil parsing.

## User Outcome
Di /profile user lihat hasil parsing dalam kartu (Profil, Ringkasan, Keahlian,
Pengalaman, Pendidikan, Sertifikat, Tautan), lalu bisa menekan Edit untuk
memperbaiki tiap field lalu Simpan.

## In Scope
- POST /api/cv/upload (multipart, PDF only, max 5MB)
- pdf-parse extract, heuristic + optional LLM extraction (OpenAI-compatible)
- Field yang diekstrak: fullName, headline, location, email, phone, skills[],
  summary, experience[], education[], certifications[], links[]
- Prisma Profile create/update (kolom baru), GET /api/profile, PUT /api/profile (edit)
- UI: dropzone drag-drop, hero + result cards, inline edit mode (Edit → input → Save)
- Badge "heuristik (tanpa AI)" saat parsedWith = heuristic

## Out Of Scope
- OCR scan, DOCX (post-MVP), multi CV version history kompleks
- AI auto-fill dari web (hanya parse CV upload)

## Acceptance Criteria
- [x] Upload PDF text-based and extraction path covered; real-PDF fixture runs
  when available (no universal live latency claim)
- [x] Reject non-PDF / >5MB dengan pesan jelas
- [x] PDF encrypted/locked -> error graceful
- [x] Real PDF fixture test passes in this workspace
- [x] PUT /api/profile menyimpan edit dan tampil setelah reload
- [x] Supported fields, including email/empty arrays and education periods, can
  be edited/cleared and persisted

## Dependencies
- 01

## Storage Behavior

- Object key uses user ID plus UUID. Upload saves a new object before atomically
  switching Profile; failures clean the new object and success cleans the old.
- MinIO dipakai bila konfigurasi lengkap; fallback lokal ada di `uploads/cvs`.
- Tidak ada version-history model; only one Profile key remains active.
- Local reads use the authenticated Profile key and real-path containment.
- Compose persists local fallback storage; MinIO E2E remains externally unverified.
