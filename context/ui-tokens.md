# UI Tokens — JobHunter

> **Source of Truth:** `design-system/jobhunter/MASTER.md` (generated via `ui-ux-pro-max` skill, variance 7 / motion 4 / density 7, Style: Flat Design).
> Tokens di bawah adalah adaptasi OKLCH + shadcn untuk implementasi Next.js. Jangan pakai raw hex/palette di components.

## Design System Master

- Master: `design-system/jobhunter/MASTER.md`
- Page overrides: `design-system/jobhunter/pages/<page>.md` (jika ada, override Master)
- WAJIB load skill `ui-ux-pro-max` sebelum desain UI baru: `python scripts/search.py "<query>" --design-system --persist -p "JobHunter"`

Perbedaan dari `../nerd/prototype` (DILARANG copy):
- Nerd: neutral OKLCH + green lime `--primary oklch(0.841 0.238 128.85)`, dense utility, mono-heavy.
- JobHunter: **professional blue `#0369A1`** + success green `#16A34A`, flat dashboard, card-focused, funnel pattern. Palette, font, dan layout baru.

## Typography

- Heading: **Fira Sans** (dari MASTER — Fira Code di MASTER adalah fallback mono, tapi untuk dashboard gunakan Fira Sans untuk heading agar lebih humanis; Fira Code hanya untuk mono/data)
- Body: **Fira Sans**
- Mono: **Fira Code** (untuk skor, gaji, log)
- Alternatif shadcn default: `Inter` jika Google Fonts gagal — jangan download font lain tanpa update MASTER.

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
--font-sans: "Fira Sans", Inter, system-ui, sans-serif;
--font-mono: "Fira Code", monospace;
```

Type scale dashboard (density 7 — balanced):
| Role | Size | Weight | Line |
|---|---|---:|---|
| Display | 30px | 700 | 36px |
| Title | 20px | 600 | 28px |
| Subtitle | 16px | 600 | 24px |
| Body | 14px | 400 | 22px |
| Label | 12px | 500 | 16px |
| Mono | 12px | 500 | 18px |
| Caption | 11px | 400 | 16px |

## Color — OKLCH (shadcn) derived dari MASTER HEX

```css
:root {
  --background: oklch(0.98 0.01 230); /* #F0F9FF */
  --foreground: oklch(0.26 0.06 240); /* #0C4A6E */
  --card: oklch(1 0 0); /* #FFFFFF */
  --card-foreground: oklch(0.26 0.06 240);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.26 0.06 240);
  --primary: oklch(0.52 0.12 240); /* #0369A1 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.70 0.12 230); /* #0EA5E9 */
  --secondary-foreground: oklch(0.15 0.03 260);
  --muted: oklch(0.95 0.01 230); /* #E7EFF5 */
  --muted-foreground: oklch(0.55 0.03 230); /* #475569 */
  --accent: oklch(0.62 0.15 145); /* #16A34A success CTA */
  --accent-foreground: oklch(1 0 0);
  --destructive: oklch(0.55 0.22 27); /* #DC2626 */
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.88 0.03 230); /* #BAE6FD */
  --input: oklch(0.88 0.03 230);
  --ring: oklch(0.52 0.12 240);
  /* Extensions */
  --color-success: oklch(0.62 0.15 145);
  --color-success-soft: oklch(0.95 0.03 145);
  --color-warning: oklch(0.78 0.16 80);
  --color-info: oklch(0.60 0.18 250);
  --radius: 0.75rem;
}

.dark {
  --background: oklch(0.18 0.03 240);
  --foreground: oklch(0.95 0.01 230);
  --card: oklch(0.22 0.03 240);
  --border: oklch(1 0 0 / 12%);
  --primary: oklch(0.65 0.12 240);
}
```

## Spacing (density 7)

| Token | Value | Usage |
|---|---|---|
| --space-xs | 4px | tight gap |
| --space-sm | 8px | icon gap |
| --space-md | 16px | card padding |
| --space-lg | 24px | section |
| --space-xl | 32px | large gap |
| --space-2xl | 48px | section margin |

## Shape & Shadow

```css
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.08);
```

Cards di primary content: `border + bg-card` (flat), shadow hanya untuk popover/dialog. Hover: `translateY(-1px) + shadow-md` (150-200ms ease).

## Motion

- Default: 150-200ms ease-out (dari MASTER: no heavy animation).
- List stagger (optional): GSAP `back.out(1.4)` 300-450ms, hanya untuk bento grid dashboard, skip jika `prefers-reduced-motion`.
- Respect `prefers-reduced-motion`.

## Invariants

- Never raw hex / raw Tailwind palette di components — pakai `bg-primary`, `text-muted-foreground`, `border-border`, dll.
- Selalu pair color + text/icon untuk status (tracker: WISHLIST/APPLIED -> badge).
- shadcn primitives di `components/ui/` mapping ke tokens di atas.
