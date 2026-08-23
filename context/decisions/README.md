# Architecture Decision Records

ADRs capture durable JobHunter choices that affect multiple features.
Feature-specific behavior remains in `context/features/`; unresolved choices
remain in `context/open-decisions.md`.

## Status

- `Proposed`: needs explicit approval or research.
- `Accepted`: implementation must follow it.
- `Superseded`: replaced by another ADR; history remains.
- `Rejected`: considered and intentionally not selected.

## Index

No formal JobHunter ADR files exist. Closed outcomes, including extension-native
PKCE capture, SHARED/PRIVATE Job ownership, SavedJob visibility, automatic migrations,
and persistent local uploads, currently live in `open-decisions.md`. Promote a
decision into an ADR when durable rationale/history needs a standalone record.

## Maintenance

- Never invent an ADR reference before its file exists.
- Never edit an ADR to hide an old decision.
- Add a replacement ADR and mark the old one superseded.
- Link relevant ADRs from feature specifications.
- Load `/architect` before accepting or superseding an ADR.
