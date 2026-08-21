# Feature 06: Email & Cover Letter

## Goal
Semi-auto: generate cover letter + kirim email via Resend.

## Status
- Cover-letter generation: DONE (AI + heuristic fallback, editable, saved to `Application.coverLetter`, UI di Kanban EditSheet).
- Email send via Resend: DEFERRED (pending OD-003 domain/key). Scope reduced by user to generation only for now.


## User Outcome
Dari Application: Generate Cover Letter (AI) -> edit -> Send Email -> EmailLog.

## In Scope
- AI cover letter: POST /api/ai/cover-letter {profileId,jobId}
- POST /api/email/send (ownership + rate limit, Resend), EmailLog
- Template plain, domain verified

## Out Of Scope
- Auto-login ke portal pihak ketiga

## Acceptance Criteria
- [ ] Generate menghasilkan draft editable
- [ ] Send sukses -> log terbuat, tampil di UI
- [ ] Non-owner tidak bisa send untuk app orang lain

## Dependencies
- 01, 02, 03, 04, 05
