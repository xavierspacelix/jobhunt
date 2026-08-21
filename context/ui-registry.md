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
