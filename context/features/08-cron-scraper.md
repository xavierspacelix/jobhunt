# Feature 08: Cron Scraper & Recommendations (Fase 3, deferred)

## Goal
Auto-cari lowongan per 6 jam berdasar skill Profile.

## User Outcome
Tab "Rekomendasi Untukmu" terisi otomatis.

## In Scope
- Playwright cron (vercel.json), keyword dari Profile.skills
- Save to Job + tampil di /jobs?tab=recommended

## Out Of Scope
- MVP blocking

## Acceptance Criteria
- [ ] Cron batch 20, handle 429 backoff
- [ ] Manual trigger works

## Dependencies
- 01, 02, 03
