# UI Rules — JobHunter

## Wajib: Load Skill Sebelum UI

> **WAJIB** jalankan skill `ui-ux-pro-max` sebelum desain/implementasi/review UI apapun.
> ```bash
> python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "job hunter dashboard <keyword>" --design-system --persist -p "JobHunter"
> ```
> Baca `design-system/jobhunter/MASTER.md` + override `pages/<page>.md` jika ada. Jangan copy paste dari `../nerd/prototype` — palette, typography, layout harus baru (lihat `ui-tokens.md`).

## Direction

JobHunter adalah dashboard produktivitas pencari kerja — bersih, modern, card-focused, funnel 3-step (hero → solusi → aksi). Bukan dense utility seperti Nerd. Chrome tipis, data breathing space, status jelas.

- Stack UI: **shadcn/ui (new-york)** allowed, tapi pakai token JobHunter (blue #0369A1 + green #16A34A) bukan neutral lime Nerd.
- Style: Flat Design, minimal shadow, clean lines, icon-heavy, fast (no heavy gradients/blur decoration).

## Layout

- Responsive web-first: mobile 375px, tablet 768px, desktop 1024/1440px. Sidebar offcanvas di <768px, visible 240px di desktop.
- Header 56px, border-b hairline `border-border/40`.
- Sidebar nav: Dashboard, Jobs, Tracker (Kanban), Profile (CV), Settings. Active: `bg-accent` atau `bg-primary` + `text-primary-foreground`, semibold.
- Content max-w 1280px centered, padding 16 (mobile) / 24 (desktop).
- Kanban: 6 columns horizontal scroll di mobile, grid di desktop.

## Density (density dial 7)

- Button 36px default, 32px compact, 44px min touch target di mobile.
- Card padding 16-24px, gap 16-24px antar section.
- Satu bordered surface per level — jangan nest card di card.

## Status (Tracker)

- Token: success (APPLIED/INTERVIEW), warning (SCREENING), info (WISHLIST), danger (REJECTED), muted (OFFER pending).
- Selalu color + text + icon (Lucide). Jangan hanya warna.

## Forms & JobHunter specifics

- Label selalu di atas field; placeholder = example ("Paste URL Glints...").
- CV upload: drag-drop + progress + validasi PDF 5MB inline.
- Job fetch: input URL dengan validasi domain allowlist + tombol "Fetch".
- Match badge: `score 0-100` dengan warna ( <50 red, 50-75 amber, >75 green ) + matched/missing chips.
- Cover letter: textarea editable sebelum kirim email.

## Empty & Loading

- Empty: kalimat + 1 CTA jelas ("Belum ada lamaran — Paste URL pertama").
- Loading: skeleton atau progress bar determinate jika bisa; jangan block full page tanpa feedback.

## Accessibility

- WCAG 2.1 AA, contrast 4.5:1, keyboard nav, focus ring 2px `ring-ring`, `prefers-reduced-motion` honored.
- Semua button/icon-only punya `aria-label`.

## Anti-patterns (hard ban)

- Hardcoded hex / `bg-blue-500` / raw palette.
- Copy palette/typography/layout dari `../nerd/prototype`.
- Gradient text, glass blur dekoratif, emoji sebagai icon.
- Hidden filters, outdated forms (dilarang per MASTER).
- `card shadow-sm + bg-gradient` SaaS dashboard look berlebihan — JobHunter flat: `border + bg-card`, shadow hanya dialog/popover.
