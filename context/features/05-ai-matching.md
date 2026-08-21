# Feature 05: AI Matching Score

## Goal
Scoring CV vs JD 0-100 + matched/missing.

## User Outcome
Di detail Job/Application klik "Cek Kecocokan" -> badge score + chips.

## In Scope
- POST /api/match {profileId, jobId} -> Vercel AI SDK + OpenAI gpt-4o-mini (JSON schema)
- Prompt: CV truncated 8000 chars + JD 8000 chars, temp 0.2
- Cache key hash(profileId+jobId+updatedAt) di Application
- Rate limit 10/min per user

## Out Of Scope
- Cover letter (06), cron

## Acceptance Criteria
- [ ] Score 0-100 tersimpan & cache hit tidak hit LLM lagi
- [ ] Matched/missing tampil
- [ ] Error LLM -> fallback pesan, tidak crash

## Dependencies
- 01, 02, 03, 04
