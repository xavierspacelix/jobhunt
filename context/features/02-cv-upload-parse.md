# Feature 02: CV Upload & Parse (PDF)

## Goal
User upload PDF CV → sistem ekstrak skill & ringkasan → simpan sebagai Profile.

## User Outcome
Di /profile user lihat hasil parsing: skills chips, summary, experience snippet.

## In Scope
- POST /api/cv/upload (multipart, PDF only, max 5MB)
- pdf-parse extract, heuristic + optional LLM skill extraction
- Prisma Profile create/update, GET /api/profile
- UI: dropzone drag-drop, progress, error inline, display result

## Out Of Scope
- OCR scan, DOCX (post-MVP), multi CV version history kompleks

## Acceptance Criteria
- [ ] Upload PDF text-based sukses <10s, skills tampil
- [ ] Reject non-PDF / >5MB dengan pesan jelas
- [ ] PDF encrypted/locked -> error graceful
- [ ] Parse fixture tested

## Dependencies
- 01
