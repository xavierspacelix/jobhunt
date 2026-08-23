# Feature 07: Dashboard & Analytics

## Goal
Overview & reminder.

## User Outcome
Dashboard lihat total applied, interview rate, upcoming follow-up H+7.

## In Scope
- Profile completeness, four KPI cards, status distribution
- Reminder list (`nextFollowUpAt` <= H+7), exclude WISHLIST/REJECTED, sorted date
- Per-user queries resolved from authenticated session email
- Profile/CV status card and navigation CTAs

## Out Of Scope
- Charts berat (hanya stat cards flat)

## Acceptance Criteria
- [x] Stats query di-scope per user
- [x] Reminder hanya mengambil Application user aktif
- [x] Empty state tersedia untuk distribusi dan reminder
- [x] Uses shared authenticated shell; status distribution has textual accessible
  context and dashboard extension download/connection actions have accessible
  loading/success/error state plus separate local-install/server-connection status

## Dependencies
- 01, 04
