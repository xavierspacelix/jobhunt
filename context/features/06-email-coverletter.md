# Feature 06: Cover Letter Generation

## Goal

Generate draft cover letter dari Profile + Job, lalu biarkan user mengedit dan
menyimpannya pada Application.

## Status

Delivered scope complete. Email sending was removed from this feature and is
deferred under OD-003; Resend/Nodemailer are not installed.

## User Outcome

Dari edit Application, user bisa generate cover letter formal Bahasa Indonesia,
edit draft, copy, regenerate, dan menyimpan hasilnya.

## In Scope

- `POST /api/ai/cover-letter {applicationId}` with ownership check
- OpenAI-compatible generation with heuristic formal fallback
- Separate process-local 10/min rate-limit key for cover-letter generation
- Persist draft in `Application.coverLetter`
- Editable dialog in tracker

## Out Of Scope

- Email sending, recipient validation, Resend, and EmailLog writes
- Auto-login or auto-apply to third-party portals

## Acceptance Criteria

- [x] Generate menghasilkan draft editable
- [x] Draft bisa regenerate, copy, dan disimpan ke Application
- [x] Non-owner tidak bisa generate untuk Application orang lain
- [x] Tanpa LLM atau saat LLM error, heuristic fallback tetap menghasilkan draft
- [x] LLM response is timeout-bounded and strict-schema parsed; UI exposes
  loading/error/edit/copy/save states

## Deferred Email Scope

Jika OD-003 diselesaikan, email harus menjadi feature/spec terpisah dengan
ownership, recipient policy, anti-spam rate limit, provider failure handling,
plain/sanitized template, dan EmailLog acceptance tests.

Prompt injection remains an honest residual because Profile/Job text is
untrusted. The draft is never sent automatically and must be reviewed by user.

## Dependencies

- 01, 02, 03, 04, 05
