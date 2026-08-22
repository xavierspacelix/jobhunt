# UI Registry — JobHunter

Living registry for reusable web UI. Read before creating component, update after adding via `/imprint`.

> **Design System:** `design-system/jobhunter/MASTER.md` (ui-ux-pro-max) + tokens `ui-tokens.md`.
> Style: Flat Design, blue #0369A1 + green #16A34A. JANGAN copy `../nerd/prototype` (neutral lime, dense utility).

## Entry Format

```md
### ComponentName
- Path:
- Purpose:
- Variants:
- Tokens:
- Accessibility:
- Used by:
```

## Implemented

### BrandLogo

File: `components/brand-logo.tsx`
Last updated: 2026-08-22

### StatusBadge

File: `components/status-badge.tsx`
Last updated: 2026-08-22

| Property | Class |
|---|---|
| Text + icon color | `STATUS_VAR[status]` (var per status) |
| Background | `color-mix(in srgb, <color> 14%, transparent)` |
| Dot | `size-1.5 rounded-full` dengan `backgroundColor` = status color |
| Radius / padding | `rounded-full px-2.5 py-0.5 text-xs font-medium` |
| Status labels | `STATUS_LABELS` dari `lib/kanban` |

**Pattern notes:** One source of truth untuk badge status aplikasi. Dipakai di `kanban-board.tsx` (TableView) dan `reminder-list.tsx`. Jangan hardcode warna status di tempat lain — pakai komponen ini. Tokens: `--color-info`, `--color-success`, `--color-warning`, `--color-muted-status`, `--destructive` (lihat `lib/kanban.ts` + `globals.css`).

### StatCard

File: `components/stat-card.tsx`
Last updated: 2026-08-22

| Property | Class |
|---|---|
| Container | `rounded-2xl border-border bg-card p-4 shadow-sm` + hover `transition-all duration-200 hover:-translate-y-px hover:shadow-md` |
| Icon box | `size-8 rounded-xl bg-accent/10 text-accent` |
| Value | `mt-3 text-2xl font-semibold text-foreground` |
| Label | `text-sm text-muted-foreground` |
| Hint | `mt-1 text-xs text-muted-foreground` |

**Pattern notes:** KPI card seragam untuk dashboard. Dipakai di `app/dashboard/page.tsx` (Total Lamaran, Terkirim, Wawancara, Penawaran). Terima props `icon, label, value, hint?, className`. Jangan hardcode warna — pakai `bg-accent/10 text-accent`.

### ReminderList

File: `components/reminder-list.tsx`
Last updated: 2026-08-22

| Property | Class |
|---|---|
| Container | `flex h-full flex-col rounded-2xl border-border bg-card p-5 shadow-sm` |
| Header icon | `size-8 rounded-xl bg-accent/10 text-accent` |
| Empty state | centered `ListChecksIcon` + muted text |
| Row | `flex items-start gap-3 rounded-xl border-border bg-background/40 p-3 hover:bg-muted/40` (Link ke `/tracker`) |
| Status | `StatusBadge` |
| Relative date | `text-xs font-medium` — `--color-success` untuk INTERVIEW, `--color-warning` untuk lainnya |

**Pattern notes:** Menampilkan aplikasi dengan `nextFollowUpAt` ≤ H+7 (exclude WISHLIST/REJECTED), sorted by date, label relatif ("Hari ini/Besok/N hari lagi"/"Lewat jadwal"). Export type `AnalyticsApplication`. Query tetap di-scope per user di page.

### StatusDistribution

File: `components/status-distribution.tsx`
Last updated: 2026-08-22

| Property | Class |
|---|---|
| Container | `rounded-2xl border-border bg-card p-6 shadow-sm` |
| Bar track | `flex h-2.5 w-full overflow-hidden rounded-full bg-muted` |
| Segment | `width: (count/total)%; backgroundColor: STATUS_VAR[status]` + `title` tooltip |
| Legend | `grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3` — dot `size-2.5 rounded-full`, label `text-muted-foreground`, count `ml-auto font-medium text-foreground` |

**Pattern notes:** Stacked bar pipa status lamaran (WISHLIST→OFFER). Warna dari `STATUS_VAR` (`lib/kanban.ts` + `globals.css`). Hanya segment dengan count>0 yang dirender. Dipakai di `app/dashboard/page.tsx`.

| Property | Class |
|---|---|
| Mark background | `fill-accent` |
| Mark foreground | `stroke-accent-foreground` |
| Border radius | SVG `rx="12"` in a 44px view box |
| Text — primary | `text-foreground` |
| Text size and weight | `text-lg font-medium tracking-[-0.035em]`; `Job` uses `font-semibold` |
| Spacing | `gap-2.5` |
| Shadow | none |

**Pattern notes:** Minimal ascending path represents deliberate career progress. Use the full wordmark for navigation and auth surfaces; use `markOnly` only where space is constrained. Keep the mark flat, single-accent, and free of gradients or decorative effects.

Target primitives (shadcn allowed, baru buat jika belum ada):
- `components/ui/button.tsx` — variants: default(primary), secondary, outline, ghost, destructive
- `components/ui/card.tsx`
- `components/ui/badge.tsx` — untuk match score & tracker status
- `components/features/job-card.tsx` — job list card (logo, title, company, match badge)
- `components/features/kanban-column.tsx` — tracker column
- `components/features/match-badge.tsx` — score 0-100 dengan color mapping
- `components/features/cv-dropzone.tsx` — PDF upload
- `components/ui/dialog.tsx`, `input.tsx`, `separator.tsx`, `dropdown-menu.tsx`

Jangan buat komponen baru jika sudah ada di registry — reuse dulu. Setelah tambah komponen reusable, update file ini.
