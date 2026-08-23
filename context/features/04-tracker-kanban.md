# Feature 04: Application Tracker (Kanban)

## Goal
Tracker WISHLIST→REJECTED dengan drag-drop.

## User Outcome
Di `/tracker` user drag card antar kolom, edit notes & nextFollowUp.

## In Scope
- CRUD `/api/applications`, status enum 6 nilai, ownership dari session user
- Halaman /tracker (nav "Pelacak Lamaran" aktif); application dibuat dari Job
  tersimpan via tombol "Tracker" di /jobs (upsert by [userId, jobId])
- Kanban dnd-kit: drag antar kolom persist status + auto-kelola appliedAt
  (WISHLIST -> clear; keluar WISHLIST tanpa tanggal -> isi hari ini)
- Tiga view: Board (redesign, status accent + count + drag handle), Table
  (Jira-like sortable per kolom), List (mobile)
- Edit sheet: status, notes, appliedAt, nextFollowUpAt, hapus
- Status color token (`--color-success/warning/info/muted-status` + destructive)

## Out Of Scope
- Email, AI score (fitur 05/06)

## Acceptance Criteria
- [x] Drag-drop persist ke DB (status + appliedAt)
- [x] Filter & search works (cari perusahaan/posisi)
- [x] Mobile: board horizontal scroll + view List/Table
- [x] Ownership check: aplikasi di-scope ke authenticated user
- [x] Table view sortable (status/posisi/perusahaan/lokasi/sumber/tanggal)
- [x] appliedAt otomatis: clear saat WISHLIST, isi hari ini saat keluar WISHLIST

## Dependencies
- 01, 03

## Current Protections

- API enforces `appliedAt` transitions and accepts explicit null to clear dates.
- Board supports pointer and keyboard sensors/announcements; rows/cards expose
  keyboard actions and visible focus behavior.
- Applications remain user-scoped even when referencing a SHARED Job.
