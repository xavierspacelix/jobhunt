# Feature 05: AI Matching Score

## Goal
Scoring CV vs JD 0-100 + matched/missing.

## User Outcome
Di detail Job/Application klik "Cek Kecocokan" -> badge score + chips.

## In Scope
- POST `/api/match` `{jobId}` -> resolve profile dari session user
- Skor via LLM (OpenAI-compatible, `LLM_BASE_URL`, JSON mode, temp 0.2)
  bila `LLM_API_KEY`+`LLM_BASE_URL` ada; else heuristic (overlap
  skill profil vs job.skills / scan deskripsi). Fallback otomatis bila
  LLM error (sesuai pola CV extraction).
- Simpan di model `Match`: score, matchedSkills, missingSkills, source, cacheKey.
- Cache key includes Profile revision, prompt version, and relevant Job content.
- Rate limit 10/min per user (OD-009).
- UI "Cek Kecocokan" di Job Detail sheet & edit Application -> badge
  skor + chips cocok/kurang.

## Out Of Scope
- Cover letter (06), job discovery/search (08)

## Acceptance Criteria
- [x] Score 0-100 tersimpan di Match & cache hit tidak hit LLM lagi
- [x] Matched/missing tampil sebagai chips
- [x] Tanpa LLM -> heuristic; bila LLM error -> fallback heuristic (tidak crash)
- [x] Rate limit 10/min per user; 429 bila melampaui
- [x] Tanpa CV -> 400 "Unggah CV dahulu"

## Dependencies
- 01, 02, 03, 04

## Runtime Constraints

- Limiter adalah fixed-window in-memory per email, sehingga reset saat process
  restart dan tidak shared antar replica.
- Cache lookup dilakukan setelah rate-limit check; cache hit tetap memakai quota.
- LLM request has a timeout and strict output schema, but CV/JD prompt content is
  untrusted. Score remains advisory and requires user review.
