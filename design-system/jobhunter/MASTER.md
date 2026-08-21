# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** JobHunter
**Generated:** 2026-08-22
**Category:** Personal Productivity
**Design Dials:** Variance 4/10 (Balanced / Modern) | Motion 3/10 (Subtle) | Density 6/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background (canvas) | `#FAF8F4` | `--color-background` |
| Foreground (ink) | `#1C1917` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#1C1917` | `--color-card-foreground` |
| Primary (ink) | `#1C1917` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary (warm panel) | `#F1EBE0` | `--color-secondary` |
| Accent / CTA | `#4F46E5` | `--color-accent` |
| On Accent / CTA | `#FFFFFF` | `--color-on-accent` |
| Muted | `#F5F1EA` | `--color-muted` |
| Muted Foreground | `#78716C` | `--color-muted-foreground` |
| Border | `#E7E5E4` | `--color-border` |
| Ring | `#4F46E5` | `--color-ring` |
| Destructive | `#DC2626` | `--color-destructive` |

**Color Notes:** Warm cream canvas + muted indigo accent. Soft, friendly, low-contrast chrome. One accent color only — avoid saturated/competing hues.

### Typography

- **Heading Font:** Inter
- **Body Font:** Inter
- **Mono:** JetBrains Mono (skor, gaji, log)
- **Mood:** clean, friendly, warm, modern, approachable
- **Google Fonts:** [Inter + JetBrains Mono](https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap)

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `2px` | Tight gaps |
| `--space-sm` | `4px` | Icon gaps |
| `--space-md` | `8px` | Standard padding |
| `--space-lg` | `12px` | Section padding |
| `--space-xl` | `16px` | Large gaps |
| `--space-2xl` | `24px` | Section margins |
| `--space-3xl` | `32px` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(28,25,23,0.04)` | Subtle lift / cards |
| `--shadow-md` | `0 4px 12px rgba(28,25,23,0.06)` | Cards, buttons |
| `--shadow-lg` | `0 12px 24px rgba(28,25,23,0.08)` | Modals, dropdowns |

---

## Component Specs

### Buttons

```css
.btn-primary {
  background: #4F46E5;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.92; }

.btn-secondary {
  background: transparent;
  color: #1C1917;
  border: 1px solid #E7E5E4;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E7E5E4;
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E7E5E4;
  border-radius: 12px;
  font-size: 15px;
  background: #FFFFFF;
  transition: border-color 200ms ease;
}
.input:focus {
  border-color: #4F46E5;
  outline: none;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.18);
}
```

---

## Style Guidelines

**Style:** Soft Warm Minimal

**Keywords:** warm, soft, rounded, friendly, calm, clean, spacious, approachable, low-contrast chrome

**Best For:** personal productivity tools, SaaS onboarding, dashboards, friendly web apps

**Key Effects:** soft shadows, rounded corners (14–16px), gentle hover (opacity/color shift), 200ms ease transitions, generous whitespace, single muted accent

### Page Pattern

**Auth (Split):** Left warm brand panel (logo + pitch headline + 3 value points with check badges), right centered form card on cream canvas.

---

## Motion

**Subtle (Standard)** — 200–250ms ease, opacity/color only. Respect `prefers-reduced-motion: reduce` (skip non-essential motion).

---

## Anti-Patterns (Do NOT Use)

- ❌ Emojis as icons (use SVG / Lucide)
- ❌ Missing `cursor: pointer` on clickables
- ❌ Layout-shifting hovers (scale transforms)
- ❌ Low contrast text (< 4.5:1)
- ❌ Instant state changes (always transition 150–300ms)
- ❌ Invisible focus states
- ❌ Harsh/saturated colors or heavy shadows

---

## Pre-Delivery Checklist

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from a consistent set (Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
