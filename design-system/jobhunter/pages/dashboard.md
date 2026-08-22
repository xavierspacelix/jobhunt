# Page: Dashboard

**Layout:** App shell with persistent left **Sidebar** (desktop) + top bar with hamburger (mobile drawer). Main content is a **bento grid** (Soft Warm Minimal, no horizontal scroll).

**Main content (top → bottom), spacious (`gap-6 md:gap-8`, `p-6 md:p-8`):**
- **Hero card:** Greeting `Halo, {Name}` + date + one-line subtitle on the left; Kelengkapan Profil % + progress bar on the right (`w-full max-w-xs`). Airy, bold heading.
- **KPI row:** 4 `StatCard`s in `grid sm:grid-cols-2 lg:grid-cols-4` — Total Lamaran, Terkirim, Wawancara (+ `interviewRate% dari terkirim` hint), Penawaran. Modern metric style: label `text-xs uppercase tracking-wide`, value `text-3xl font-bold tracking-tight`. Source: `Application` scoped by `user.email`.
- **Bento `lg:grid-cols-3`:** left `lg:col-span-2` stack = `StatusDistribution` (stacked status bar + legend) + `ReminderList` (Tindak Lanjut 7 hari); right `col-span-1` = **Profil & CV** card (3 `ProfileRow` status rows, optional ringkasan CV `line-clamp-3`, CTA Perbarui CV + Kelola Profil).
- **Keahlian & Pengalaman:** TIDAK ditampilkan di dashboard (pindah ke `/profile`) — mengurangi kepadatan.

**Components:** `components/stat-card.tsx`, `components/status-distribution.tsx`, `components/reminder-list.tsx` (+ `AnalyticsApplication` type), `components/status-badge.tsx`.

**Tokens:** cards `bg-card border-border rounded-2xl shadow-sm`; hover `-translate-y-px shadow-md` (200ms ease); CTA `bg-accent text-accent-foreground`; icon chips `bg-accent/10 text-accent rounded-xl`; progress `bg-muted` track + `bg-accent` fill; status bar `bg-muted` track + `STATUS_VAR` segments. No raw hex — tokens only.

**Responsive:** Sidebar hidden `< lg`; `lg:` static `w-64`. Grids collapse to 1–2 cols on mobile; main is `min-w-0 flex-1`. No horizontal scroll.

**Rules:** No emojis; Lucide icons only; visible focus; `aria-current` on active link; `aria-label` on icon buttons; respects `prefers-reduced-motion`.
