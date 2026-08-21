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
- [ ] Upload PDF text-based sukses <10s, field terisi (skills/summary/experience minimal)
- [ ] Reject non-PDF / >5MB dengan pesan jelas
- [ ] PDF encrypted/locked -> error graceful
- [ ] Parse fixture tested
- [ ] PUT /api/profile menyimpan edit dan tampil setelah reload
- [ ] Edit mode menampilkan input untuk semua field; Save persist

## Dependencies
- 01
