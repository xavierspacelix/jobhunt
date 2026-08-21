# Project Overview

## Product

JobHunter adalah tools pribadi web untuk pencari kerja di Indonesia. Membantu user: upload CV → paham skill/profile → temukan lowongan relevan (Glints & Jobstreet) → cek kecocokan CV vs Job Description (AI scoring) → lamar semi-otomatis/tracking → catat progress hingga offer.

Bukan job portal baru, tapi aggregator + tracker + AI assistant di atas portal existing.

## Target User

- Job seeker Indonesia (fresh grad, switch career, professional) yang apply ke banyak lowongan dan butuh tracker terpusat.
- Single user awalnya, tapi support multi-user via auth.
- Menggunakan Glints & Jobstreet sebagai sumber utama.

## Platform

- Web app responsive (desktop + mobile browser)
- PWA installable (Fase 3)
- MVP: Chrome/Edge/Firefox modern
- License: Private (MVP), Open Source dipertimbangkan post-MVP
- Versioning: SemVer untuk app, Prisma migrations independent
- Commit: Conventional Commits 1.0.0

## Product Principles

1. Simple first: tracking manual harus bisa dipakai tanpa AI/scraping.
2. Paste-URL first: tidak scraping brutal di MVP, hormati portal.
3. AI assist, bukan AI auto: scoring & suggestion, keputusan tetap user.
4. Privacy: CV dan data lamaran milik user, tidak di-share.
5. Modular parser: tiap sumber (Glints/Jobstreet) parser terpisah, mudah fix jika HTML berubah.
6. Email reliable: Resend, tidak spammy, log terkontrol.
7. Mobile usable: tracker bisa dicek dari HP.

## Core User Flow

1. User register/login (NextAuth).
2. Upload CV PDF → sistem parse → ekstrak skills, pengalaman, ringkasan → simpan sebagai Profile.
3. User paste URL lowongan Glints/Jobstreet → sistem fetch & parse detail → simpan Job.
4. User klik "Cek Kecocokan" → LLM hitung score 0-100 + matched/missing skills → simpan di Application.
5. User buat Application (Wishlist → Applied → Screening → Interview → Offer/Rejected) dan bisa kirim email (Resend) dari app.
6. Dashboard Kanban untuk drag status, notes, next follow-up, reminder email H+7.
7. (Fase 3) Cron auto-cari lowongan berdasarkan skill profile dan tampilkan di "Rekomendasi Untukmu".

## MVP Features

Spec di `context/features/` adalah source of truth.

1. Foundation, Auth & DB setup
2. CV Upload & Parse (PDF)
3. Job Fetch via Paste URL (Glints & Jobstreet)
4. Application Tracker (Kanban, status, notes)
5. AI Matching Score (CV vs JD)
6. Email Integration (Resend) + Cover Letter Generator
7. Dashboard & Analytics
8. Cron Scraper + Rekomendasi (Fase 3, tidak blocking MVP)

## Out Of Scope (MVP)

- OCR untuk scan CV gambar (hanya text-based PDF)
- Auto-apply bot yang login ke Glints/Jobstreet
- Native mobile app
- Sumber selain Glints/Jobstreet (LinkedIn, Kalibrr, etc. → post-MVP)
- Real-time chat/notification selain email

## Success Criteria

- User bisa upload CV PDF dan lihat hasil parsing dalam <10 detik.
- User bisa paste URL Glints/Jobstreet dan dapat detail lowongan terstruktur.
- Matching score konsisten dan tersimpan (cache).
- Kanban tracker drag-drop lancar di desktop & mobile.
- Email terkirim via Resend tanpa masuk spam (SPF/DKIM ok).
- yarn build & yarn test pass, tidak ada hardcoded color/token violation.
