# Roadmap — JobHunter

Track candidates that have not been promoted. Active status remains in
`progress-tracker.md`.

## MVP

Features 01-08 are MVP. Feature 12 was explicitly promoted and implemented as an
extension-native DOM preview with explicit PKCE-authenticated direct-save.

## Post-MVP Candidates

| ID | Feature | Spec | State |
|---|---|---|---|
| 09 | LinkedIn & Kalibrr source | Spec dibuat saat dipromosikan | candidate |
| 10 | OCR scan CV | Spec dibuat saat dipromosikan | candidate |
| 11 | PWA offline | Spec dibuat saat dipromosikan | candidate |
| 13 | Auto-tailor CV per lowongan | Spec dibuat saat dipromosikan | candidate |

## Promotion Workflow

1. `/architect` + validasi need.
2. Resolve open-decisions & deps.
3. Masukkan ke `build-plan.md` + `progress-tracker.md` sebagai `planned`.

## External Follow-up

- Feature 08 remains in progress until live Glints/Jobstreet and deployed browser
  fallback are verified.
- Email is not a delivered feature; OD-003 remains open before a separate email
  spec can be promoted.
