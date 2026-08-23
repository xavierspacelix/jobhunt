# UI Rules - JobHunter

## Required Preparation

Load `ui-ux-pro-max` before UI design, implementation, or review. Read:

1. `design-system/jobhunter/MASTER.md`
2. Matching `design-system/jobhunter/pages/<page>.md` override, if present
3. `ui-tokens.md`
4. `ui-registry.md`

Do not regenerate/overwrite MASTER without explicit authorization. Do not copy
the palette, typography, or layout from `../nerd/prototype`.

## Direction

JobHunter is a calm personal-productivity dashboard: Soft Warm Minimal, cream
canvas, warm panels, single muted-indigo accent, rounded surfaces, clear status,
and subtle depth. Avoid generic gradient/glass SaaS decoration and dense utility
layouts.

- Stack: Tailwind v4, shadcn `base-nova`, Base UI, Lucide, next-themes.
- Typography: Inter with JetBrains Mono for scores/salaries/progress.
- Theme: semantic tokens only; warm light and warm dark modes.

## Layout

- Verify 375px, 768px, 1024px, and 1440px.
- Runtime sidebar changes to off-canvas below 768px and is visible above it.
- Runtime authenticated header is currently 64px (`h-16`) with hairline border.
- Implemented nav: Dashboard, Profil & CV, Lowongan, Pelacak Lamaran.
- Content target: centered, maximum 1280px, 16px mobile/24px desktop padding.
- Kanban target: horizontal mobile presentation and accessible multi-column
  desktop layout. Runtime currently scrolls horizontally at all breakpoints.
- Avoid unintentional page-level horizontal overflow.

## Density and Surfaces

- MASTER density: 6/10.
- Default control target: at least 36px; interactive mobile touch target 44px.
- Card padding: 20-24px; section gaps: 24-32px.
- One bordered surface per hierarchy level; avoid card-inside-card stacking.
- Subtle card shadow is allowed by MASTER; dialogs/dropdowns may use stronger
  depth. Never combine heavy gradient and heavy shadow.
- Hover must not scale or shift surrounding layout.

## Tracker Status

- Status uses shared labels/colors from `lib/kanban.ts` and semantic CSS vars.
- Always pair status color with visible text and, where useful, icon/dot.
- Do not duplicate status mapping in feature components.

## Forms and Product Patterns

- Visible label above every field; placeholder is an example, not the label.
- CV upload: drag/drop plus file picker, inline PDF/5 MiB validation, keyboard
  activation, and determinate progress when measurable.
- Paste URL: source validation, clear loading/error state, structured preview,
  and editable manual fallback when parsing cannot recover.
- Search: editable keyword/location, live SSE progress, explicit save action.
- Match score runtime bands are `<40`, `40-69`, and `>=70`; always include text
  and matched/missing skill details.
- Cover letter is editable before save. Email sending is not implemented.

## Empty, Loading, and Error

- Every asynchronous UI needs loading, error, empty, and success feedback.
- Prefer skeleton or local progress; never block the full page without feedback.
- Empty states use one concise explanation and one primary next action.
- User-facing product text is Bahasa Indonesia unless it is a source value or
  unavoidable technical identifier.

## Accessibility

- WCAG 2.1 AA, text contrast at least 4.5:1.
- Visible focus ring; no focus-ring removal without an accessible replacement.
- Keyboard access for clickable rows, dropzones, dialogs, and drag alternatives.
- Icon-only buttons require an Indonesian `aria-label`.
- Touch targets at least 44x44px on mobile with adequate spacing.
- Respect `prefers-reduced-motion`; remove non-essential pulse, translate, and
  entrance/exit motion.
- Do not rely on color or native `title` alone to communicate data.

## Hard Bans

- Raw hex or raw Tailwind palette classes in components.
- Copying Nerd's neutral/lime visual language.
- Emoji as icons; use Lucide/SVG.
- Gradient text and decorative glass blur.
- Hidden essential filters, hover-only actions, or mouse-only interaction.
- A second match/status color mapping outside the shared source.

## Current Conformance

The remediation tranche moved authenticated pages to one shell, removed raw
palette utilities, added keyboard paths for CV/tracker interactions, improved
touch targets/status semantics, and added reduced-motion handling. Repository
UI gates pass; browser E2E is still absent, so cross-browser interaction remains
an external verification gap rather than a claimed automated guarantee.
