# Feature 04: Application Tracker (Kanban)

## Goal
Tracker WISHLIST→REJECTED dengan drag-drop.

## User Outcome
Di /dashboard user drag card antar kolom, edit notes & nextFollowUp.

## In Scope
- CRUD /api/applications, status enum 6 nilai, validasi ownership
- Kanban dnd-kit, filter by status/company, list view mobile
- Notes, appliedAt, nextFollowUpAt

## Out Of Scope
- Email, AI score (fitur 05/06)

## Acceptance Criteria
- [ ] Drag-drop persist ke DB
- [ ] Filter & search works
- [ ] Mobile horizontal scroll ok
- [ ] Ownership check: user A tidak bisa lihat app user B

## Dependencies
- 01, 03
