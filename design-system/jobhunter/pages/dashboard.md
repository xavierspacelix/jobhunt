# Page: Dashboard

**Layout:** App shell with persistent left **Sidebar** (desktop) + top bar with hamburger (mobile drawer). `DashboardShell` wraps the main content.

**Sidebar contents:**
- Brand logo at top.
- Primary nav: Dashboard (`/dashboard`), Profil & CV (`/profile`). Future items (Pelacak Lamaran, Pengaturan) shown disabled with a `soon` tag.
- Active route highlighted with `bg-accent/10 text-accent` (active state via `usePathname`).
- Footer: user email + ThemeToggle + Sign out (server action).

**Main content:**
- Greeting header (`Halo, {Name}` from email local part).
- 3 stat cards: Status CV (Terkumpul/Belum), Skill terdeteksi (count), Lamaran terkirim (count from `Application`).
- Quick actions card: Unggah / Perbarui CV (CTA → `/profile`), Cari Lowongan (disabled, soon).
- Ringkasan CV card (if profile exists): summary + skill chips + link to detail.

**Tokens:** Soft Warm Minimal. Cards `bg-card border-border rounded-2xl shadow-sm`. CTA `bg-accent text-accent-foreground`. Active nav `accent/10`. Mobile drawer uses `bg-black/40` scrim + `shadow-lg`.

**Responsive:** Sidebar hidden `< lg`; `lg:` shows static 64-width (`w-64`) sidebar. No horizontal scroll; main is `min-w-0 flex-1`.

**Rules:** No emojis; Lucide icons only; visible focus; `aria-current` on active link; `aria-label` on icon buttons; respects `prefers-reduced-motion` (global transition token).
