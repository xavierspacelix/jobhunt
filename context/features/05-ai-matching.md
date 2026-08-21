# Feature 05: AI Matching Score

## Goal
Scoring CV vs JD 0-100 + matched/missing.

## User Outcome
Di detail Job/Application klik "Cek Kecocokan" -> badge score + chips.

## In Scope
- POST /api/match {jobId} -> resolve profile dari session user
- Skor via LLM (OpenAI-compatible, `LLM_BASE_URL`, JSON schema, temp 0.2)
  bila `LLM_API_KEY`+`LLM_BASE_URL` ada; else heuristic (overlap
  skill profil vs job.skills / scan deskripsi). Fallback otomatis bila
  LLM error (sesuai pola CV extraction).
- Simpan di Application: matchScore, matchedSkills, missingSkills,
  matchCacheKey = hash(profile.updatedAt + job.id).
- Rate limit 10/min per user (OD-009).
- UI "Cek Kecocokan" di Job Detail sheet & edit Application -> badge
  skor + chips cocok/kurang.

## Out Of Scope
- Cover letter (06), cron

## Acceptance Criteria
- [x] Score 0-100 tersimpan & cache hit (matchCacheKey sama) tidak hit LLM lagi
- [x] Matched/missing tampil sebagai chips
- [x] Tanpa LLM -> heuristic; bila LLM error -> fallback heuristic (tidak crash)
- [x] Rate limit 10/min per user; 429 bila melampaui
- [x] Tanpa CV -> 400 "Unggah CV dahulu"

## Dependencies
- 01, 02, 03, 04
