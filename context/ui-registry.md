# UI Registry - JobHunter

Living inventory of reusable UI patterns implemented as of 2026-08-23. Read
before creating components and update reusable additions through `/imprint`.

> Design system: `design-system/jobhunter/MASTER.md` plus `ui-tokens.md`.
> Direction: Soft Warm Minimal, warm semantic surfaces, one indigo accent.

## Shared Baseline

- Use semantic classes only: `bg-background`, `bg-card`, `bg-secondary`,
  `text-foreground`, `text-muted-foreground`, `text-accent`, `border-border`,
  and semantic status/destructive tokens.
- Feature surfaces use `rounded-xl border border-border bg-card`; dashboard KPI
  and analytics cards use `rounded-2xl`. Standard padding is `p-5` or `p-6`;
  compact list cards use `p-3` or `p-4`; section flow uses `gap-6`.
- Labels/headings use `text-sm font-medium` or `font-semibold`; supporting copy
  uses `text-sm text-muted-foreground`; captions use `text-xs`; scores use
  `font-mono tabular-nums`.
- Interactive controls keep visible `focus-visible` rings, use semantic hover
  color/shadow changes without scaling, and expose disabled/busy state.
- Mobile controls and clickable links target 44px (`h-11`, `size-11`, or
  `min-h-11`); desktop compacts to 36px with `md:h-9`, `md:size-9`, or
  `md:min-h-9` where appropriate.
- Async errors use `role="alert"`; non-urgent completion/progress uses
  `role="status"`, `aria-live="polite"`, and `aria-atomic` when replacing a
  complete message. Spinner/pulse motion uses `motion-reduce:animate-none` and
  non-essential transitions use `motion-reduce:transition-none`.

## AuthenticatedShell

File: `components/authenticated-shell.tsx`

| Property | Implementation |
|---|---|
| Header | `h-16 border-b border-border` |
| Canonical content frame | centered `max-w-7xl` |
| Page spacing | `gap-6 p-4 md:p-6` |
| Header spacing | `gap-2 px-4 md:px-6` |
| Breadcrumb | desktop root link, truncated current page |
| Actions | `ml-auto`, optional page action, then `ThemeToggle` |

**Pattern notes:** Wrap every authenticated page with this component rather
than reproducing sidebar/header markup. Pass the Indonesian page label,
authenticated email, and optional `headerActions`.

## ExtensionDownloadButton

File: `components/extension-download-button.tsx`

- Uses shared `Button` with `variant="outline"` and `min-h-11` in shell actions.
- State is communicated by Lucide download/spinner/check icons plus changing
  visible text at large breakpoints and a state-specific `aria-label`.
- Loading sets `aria-busy`; the spinner disables motion under reduced-motion;
  successful completion is announced through an atomic polite status region.
- Failure appears in a `rounded-lg border border-border bg-card` popover with
  `px-3 py-2 text-xs text-destructive shadow-md`, connected by
  `aria-describedby` and exposed as an alert.
- Disable after success to prevent duplicate downloads; never rely on icon or
  color alone.

## JobFetcher

File: `components/job-fetcher.tsx`

### Navigation And Surfaces

- Tab rail: `rounded-lg border border-border bg-card p-1`; each tab is a
  `min-h-11 rounded-md px-3 py-2 text-sm font-medium` button with
  `aria-pressed`. Active tabs use `bg-secondary text-foreground`.
- Search/manual panels use `rounded-xl border border-border bg-card p-5` with
  `md:p-6` for primary panels; result rows use `rounded-xl ... p-4` and `gap-3`.
- Empty saved state uses `rounded-xl border border-dashed border-border
  bg-card/50 p-8 text-center` with muted icon/copy.

### Manual Preview And Private Fallback

- A 422 parse failure from a supported source opens an editable blank draft and
  explains that fields must be completed manually instead of ending the flow.
- Editing a fetched preview invalidates its preview token and displays the
  `bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm`
  notice that the edited job will be private to the account.
- Forms retain visible `text-sm font-medium text-foreground` labels; fetch/save
  controls show spinner plus Indonesian in-progress text and disable while busy.

### Search And Async Feedback

- Keyword and location remain editable before search; location chips are
  `min-h-11 rounded-full border px-3 py-2 text-xs font-medium`, use
  `aria-pressed`, and pair active state with semantic background and text.
- SSE progress is a visible icon-plus-text list. Info/step text is muted,
  completion uses foreground/accent icon, and failures use destructive text/icon.
- A separate atomic polite status region announces preparation, each meaningful
  progress event, found-job title and score, and completion for screen readers.
- Initial saved/manual loading uses tokenized skeleton rows; pulse and every
  spinner use `motion-reduce:animate-none`. Local failures are alerts; saved-list
  load failure includes an inline `Coba lagi` action.
- Search results are previews until the explicit `Simpan` action succeeds;
  loading and saved states remain visible in the button label.

### Match Score

- Label scores explicitly as `Skor kecocokan` and render `{score}/100` in a
  `rounded-full border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums`
  badge.
- Bands are `<40` destructive, `40-69` warning, and `>=70` success using semantic
  CSS variables for text, border, and a 12% mixed background.
- Never expose score by color alone: keep numeric text and labeled `Cocok` /
  `Kurang` skill groups. Matched skills use secondary pills; missing skills use
  `border-destructive/40 text-destructive` outlined pills.
- External links and icon controls retain 44px mobile targets; icon-only detail,
  close, and delete controls require Indonesian `aria-label` text.

## Extension Connection And Capture

Files: `components/extension-connection-card.tsx`,
`components/extension-connect-card.tsx`, `components/extension-job-list.tsx`, and
`browser-extension/popup.{html,css}`

- Connection cards use `rounded-2xl border border-border bg-card p-5 shadow-sm`
  with semantic status badges, permanent outlined download action, local-browser
  install state, active installation count, and two-step destructive revoke.
- PKCE consent uses the same card surface, a `bg-secondary rounded-xl p-4`
  permission explanation, explicit official extension ID, and separate cancel/
  authorize actions with alert and polite live regions.
- Extension jobs use `rounded-xl border border-border bg-card p-4`, source and
  provenance badges, 44px mobile actions, detail sheet, inline destructive
  confirmation, and extension-specific empty/retry states.
- Popup uses semantic CSS variables in light/dark mode. Preview exposes every
  persisted field, description is scrollable rather than clipped, and all controls
  have at least 44px interaction targets with visible focus outlines.
- Popup uses the BrandLogo trend mark and the product name “Job Hunter”; connection
  has no end-user settings and PKCE runs in the service worker.
- Download telemetry never hides the download action. “Installed in this browser”
  comes only from the extension handshake; server connection state is shown
  separately and never presented as proof of installation on another device.

## Profile Dropzone

File: `components/profile-manager.tsx`

- Dropzone is a `rounded-2xl border-2 border-dashed border-border
  bg-background/40 p-10 text-center` surface with `role="button"`, keyboard
  focus, and a visible `focus-visible:ring-3 focus-visible:ring-ring/50`.
- Click, Enter, Space, file picker, and drag/drop invoke the same PDF validation
  and upload path. Disabled/loading states set `aria-disabled`, `aria-busy`,
  remove tab focus, and use `cursor-not-allowed opacity-60`.
- Drag-over uses `border-accent bg-accent/5`; idle hover uses
  `hover:border-accent/60`. Transition motion is removed under reduced-motion.
- Upload state pairs spinner with `Memproses CV...`; helper copy states PDF-only
  and 5 MB. Validation/upload errors are bordered destructive alerts; success is
  an atomic polite status with icon and text.

## Kanban Accessibility

File: `components/kanban-board.tsx`

- Board supports pointer drag and `KeyboardSensor`. Screen-reader instructions
  describe Space, arrows, Escape, and drop; drag start/over/end/cancel events are
  announced in Indonesian.
- Cards expose a descriptive `aria-label`; Enter opens details and Space enters
  keyboard drag. Status changes use an atomic polite status region; failed
  optimistic updates roll back and render an alert.
- Table rows are focusable and open with Enter or Space. Sort controls are real
  buttons with 44px targets. Board/table/list selectors use `aria-pressed` and
  `min-h-11 md:min-h-9`.
- Status controls pair dot color with visible labels and `aria-pressed`; shared
  labels/colors come only from `lib/kanban.ts`.
- Draggable/list cards use `rounded-xl border border-border bg-card p-3` with
  color/shadow hover only. Card transitions and loading spinners disable
  non-essential motion under reduced-motion.

## Dashboard Components

### StatCard

File: `components/stat-card.tsx`

- Surface: `rounded-2xl border border-border bg-card p-5 shadow-sm`.
- Hover changes only shadow (`hover:shadow-md`), never position or scale; use
  `transition-shadow duration-200 ease-out motion-reduce:transition-none`.
- Label: `text-xs font-medium uppercase tracking-wide text-muted-foreground`;
  value: `mt-3 text-3xl font-bold tracking-tight text-foreground`; hint:
  `mt-1 text-xs text-muted-foreground`.
- Icon box: `size-8 rounded-xl bg-accent/10 text-accent`.

### StatusDistribution

File: `components/status-distribution.tsx`

- Surface: `rounded-2xl border border-border bg-card p-6 shadow-sm`.
- The stacked bar uses `h-2.5 overflow-hidden rounded-full bg-muted`, semantic
  status variables, `role="img"`, and an `aria-label` containing every non-zero
  status count and percentage.
- The visible legend always pairs a status dot with its text label and count;
  each count also includes screen-reader percentage text. Empty state is concise
  muted body copy.

### StatusBadge And ReminderList

- `StatusBadge` (`components/status-badge.tsx`) is the reusable six-status pill:
  visible text plus dot sourced from `lib/kanban.ts`.
- `ReminderList` (`components/reminder-list.tsx`) uses a bordered `rounded-2xl`
  card, linked rows, `StatusBadge`, and explicit relative due-date text.

## Global Loading And Error

- `app/loading.tsx` mirrors the `h-16` shell header and canonical `max-w-7xl`
  frame. Content uses tokenized `Skeleton` blocks with `rounded-lg` controls and
  `rounded-2xl` surfaces; main sets `aria-busy="true"` and includes a polite
  screen-reader loading status.
- `app/error.tsx` keeps the background/header context and presents a centered
  `rounded-2xl border border-border bg-card p-6 text-center shadow-sm` alert.
  It pairs a destructive icon tile, `text-xl font-semibold` title, muted body,
  and shared `Coba lagi` button connected through `aria-labelledby`.

## Shared Button And Input

Files: `components/ui/button.tsx`, `components/ui/input.tsx`

- Both use `rounded-lg`, semantic tokens, `text-sm`, visible
  `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`,
  disabled opacity/cursor semantics, and `motion-reduce:transition-none`.
- Default mobile height is `h-11`; desktop height is `md:h-9`. Icon buttons are
  `size-11 md:size-9`. `xs`, `sm`, and icon variants preserve the same touch
  target rather than shrinking below 44px on mobile.
- Buttons use `touch-manipulation`, `font-medium`, no wrapping, semantic
  default/cta/outline/secondary/ghost/destructive/link variants, and suppress
  the active one-pixel translation under reduced-motion.
- Inputs use `border-input bg-transparent px-2.5 py-1`, `text-base` on mobile to
  avoid browser zoom, and `md:text-sm` on desktop.
- Prefer these primitives over local controls. When native inputs are necessary,
  match their sizing, radius, focus ring, disabled state, and reduced-motion
  behavior exactly.

## Other Reusable Components

| Component | Path | Responsibility |
|---|---|---|
| `AppSidebar` | `components/app-sidebar.tsx` | Product navigation and user footer |
| `NavMain` | `components/nav-main.tsx` | Active navigation links |
| `NavUser` | `components/nav-user.tsx` | User identity, logout, dropdown |
| `BrandLogo` | `components/brand-logo.tsx` | Full wordmark or compact SVG mark |
| `ThemeProvider` | `components/theme-provider.tsx` | next-themes wrapper |
| `ThemeToggle` | `components/theme-toggle.tsx` | Light/dark/system interaction |
| `MatchDialog` / `MatchPanel` | `components/match-dialog.tsx`, `components/match-panel.tsx` | Match flow and score states |
| `CoverLetterDialog` | `components/cover-letter-dialog.tsx` | Generate, copy, edit, and save draft |

`BrandLogo` uses `fill-accent`, `stroke-accent-foreground`, a rounded SVG mark,
`text-lg` wordmark, and `gap-2.5`; use `markOnly` only in constrained chrome.

Implemented primitives under `components/ui/`: avatar, breadcrumb, button,
collapsible, dialog, dropdown menu, input, separator, sheet, sidebar, skeleton,
textarea, and tooltip. Feature surfaces compose card and badge patterns directly;
there is no shared `card.tsx` or `badge.tsx`.
