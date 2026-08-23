# UI Tokens - JobHunter

> Source of truth: `design-system/jobhunter/MASTER.md` (Soft Warm Minimal,
> variance 4, motion 3, density 6). Runtime values live in `app/globals.css`.

## Design System

- Master: `design-system/jobhunter/MASTER.md`
- Page override: `design-system/jobhunter/pages/<page>.md`
- Load `ui-ux-pro-max` before UI design, implementation, or review.
- Do not copy palette, typography, or layout from `../nerd/prototype`.

## Typography

- Sans/heading: Inter via `next/font`
- Mono: JetBrains Mono via `next/font`
- Body default: 14px with comfortable line height
- Use mono for scores, salaries, and machine-like progress only

| Role | Size | Weight | Line |
|---|---:|---:|---:|
| Display | 30px | 700 | 38px |
| Title | 20px | 600 | 28px |
| Subtitle | 16px | 500 | 24px |
| Body | 14px | 400 | 22px |
| Label | 13px | 500 | 18px |
| Mono | 12px | 500 | 18px |
| Caption | 12px | 400 | 16px |

## Runtime Color Tokens

Components must use semantic utilities such as `bg-background`, `bg-card`,
`text-foreground`, `text-muted-foreground`, `bg-accent`, and `border-border`.
Hex below documents `app/globals.css`; it is not permission to embed hex in
components.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#FAF8F4` | `#1C1917` |
| `--foreground` | `#1C1917` | `#FAF8F4` |
| `--card` / `--popover` | `#FFFFFF` | `#292524` |
| `--primary` | `#1C1917` | `#FAF8F4` |
| `--primary-foreground` | `#FFFFFF` | `#1C1917` |
| `--secondary` | `#F1EBE0` | `#2A2620` |
| `--muted` | `#F5F1EA` | `#292524` |
| `--muted-foreground` | `#78716C` | `#A8A29E` |
| `--accent` / `--ring` | `#4F46E5` | `#6366F1` |
| `--accent-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--destructive` | `#DC2626` | `#EF4444` |
| `--border` / `--input` | `#E7E5E4` | `#3F3A34` |

Status extensions:

| Token | Purpose |
|---|---|
| `--color-success` | positive/applied/interview state |
| `--color-warning` | screening/follow-up warning |
| `--color-info` | wishlist/informational state |
| `--color-muted-status` | neutral/offer state |
| `--destructive` | rejected/destructive state |

Sidebar has dedicated semantic tokens (`--sidebar*`) in `app/globals.css`.

## Spacing and Density

MASTER density is 6/10. Prefer the Tailwind spacing scale that corresponds to:

| Role | Value |
|---|---:|
| Tight | 2-4px |
| Icon/control gap | 8px |
| Compact surface padding | 12-16px |
| Standard card padding | 20-24px |
| Section gap | 24-32px |

Avoid introducing a second custom spacing-token scale unless MASTER is updated.

## Shape and Shadow

- Runtime base radius: `--radius: 0.875rem`; feature cards commonly use
  `rounded-2xl`.
- Cards: semantic surface, border, optional subtle `shadow-sm` or `shadow-md` as
  allowed by MASTER.
- Dialogs/dropdowns may use stronger `shadow-lg`.
- Hover must not scale or shift layout. Existing one-pixel card translation is
  recorded in the UI registry as a consistency issue, not a new baseline.

## Motion

- 150-250ms, opacity/color where possible.
- Respect `prefers-reduced-motion: reduce`; skip non-essential translation,
  pulse, and entrance/exit animation.
- `app/globals.css` limits global color transitions to
  `prefers-reduced-motion: no-preference`; individual animations still require
  auditing.

## Invariants

- No raw hex or raw Tailwind palette utilities in application components.
- Pair status color with text/icon; never rely on color alone.
- All shadcn/Base UI primitives map to semantic tokens.
- Dark mode uses `.dark` token overrides through next-themes, not page-specific
  color branches.
- The current remediation gate reports no raw-palette component violations;
  future changes must preserve this invariant.
