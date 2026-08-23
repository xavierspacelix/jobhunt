# Feature Specifications

Each numbered file defines one independently trackable product feature. `progress-tracker.md` is the index and status source.

MVP and promoted specifications live directly in this directory. Feature 12 is
promoted and implemented; unpromoted candidates remain in `../roadmap.md`.

## Reading Rule

Before implementation, read core context in the order defined by `AGENTS.md`, then read only:

1. Active feature file
2. Feature files listed under its Dependencies section

Do not infer scope from a future feature. If active work requires behavior owned by a future feature, expose a narrow interface or test double and leave implementation for its feature.

Do not read post-MVP candidate files during normal MVP work unless explicitly requested.

Read `../decisions/README.md` and each ADR directly referenced by the active feature. Check `../open-decisions.md` for blockers before implementation.

## Specification Sections

Every feature file must contain:

- Goal
- User Outcome
- In Scope
- Out Of Scope
- Behavior and safety rules relevant to the feature
- Acceptance Criteria
- Dependencies

Update the feature file when an agreed implementation decision changes. Do not use it as a development diary; operational notes belong in `progress-tracker.md`.

## Status

Allowed states:

- `planned`
- `in progress`
- `blocked`
- `complete`
- `needs remediation` (only while a delivered flow has unmet internal gates)

A feature becomes `complete` only after code, tests, documentation, acceptance criteria, and required review pass.

Current repository gates pass for Features 01-07 and 12. Feature 08 remains `in
progress` only for live external/deployed verification; unit/integration gates
must not be described as live Glints/Jobstreet, browser, Docker, MinIO, or email
E2E evidence.
