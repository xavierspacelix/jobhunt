# Trust Model

## Purpose

JobHunter adalah aplikasi multi-user yang memproses CV, data lamaran, URL/HTML
pihak ketiga, extension handoff, serta output LLM.

## Trust Levels

- **Trusted:** reviewed application code, committed Prisma migrations, verified
  runtime secrets, authenticated session claims.
- **User-owned:** Profile, active CV, Application, Match, Recommendation, and
  future EmailLog records belonging to that user.
- **Shared:** canonical SHARED Job content, referenced through user-owned rows.
- **User-private:** PRIVATE Job created from unsigned/edited manual data.
- **Untrusted:** credentials input, uploaded PDF, pasted URL, DNS/redirects,
  scraped HTML, job descriptions, CV text, LLM output, and user-authored notes.

## Protected Assets

- Password hashes and Auth.js JWT session cookies
- CV raw text, parsed Profile, and stored PDF
- Applications, Matches, Recommendations, cover letters, and EmailLogs
- `DATABASE_URL`, `AUTH_SECRET`, MinIO credentials, and LLM credentials
- Shared Job integrity because deletion cascades into user-owned data

## Boundaries and Required Controls

- **Browser -> page/API:** authenticate protected operations; derive identity
  from the server session; never accept a client-supplied owner ID.
- **API -> DB:** scope all user data by session; shared Job writes require a
  valid user-bound server preview and unsave must not cascade across users.
- **API -> storage:** bind every CV key to the authenticated user's Profile,
  normalize paths, and prevent traversal outside the CV root.
- **API -> scraper:** source-domain allowlist, private/special-IP rejection,
  timeout, bounded retries, and redirect destination revalidation.
- **API -> LLM:** truncate sensitive input, label untrusted content, use JSON mode
  plus strict output schemas, and keep every result advisory/user-reviewable.
- **Upload:** PDF only, maximum 5 MiB, content signature validation, no execution,
  and graceful handling of encrypted/scanned files.
- **Email:** deferred. Before enabling, require ownership, recipient policy,
  rate limiting, plain/sanitized templates, and auditable EmailLog writes.

## Implemented Controls

- Credentials are hashed with bcrypt; sessions are HTTP-only, SameSite=Lax JWT
  cookies and Secure in production.
- All protected pages and user-owned API operations derive identity from the
  authenticated session. Registration errors do not disclose account existence.
- Login/registration are limited per IP and email. Expensive endpoints have
  separate limits; all current limiters are process-local.
- Production environment validation requires `AUTH_URL`, PostgreSQL, complete
  optional service config, and `AUTH_SECRET` length >=32.
- CV upload checks MIME, size, magic bytes, encryption/text availability; local
  reads are bound to Profile and constrained by normalized plus real paths.
- SHARED Job writes require a user-bound 15-minute HMAC preview. Unsigned/edited
  input becomes PRIVATE. SavedJob and relation-based visibility isolate users;
  unsave cannot destroy shared or other-user records.
- Legacy ownerless SHARED jobs are visible only with a current-user relation;
  the migration does not guess ownership.
- Scraper transport accepts HTTPS Glints/Jobstreet only, rejects private/special
  IPs, DNS-pins every native redirect hop, blocks cross-source redirects, and
  pins browser fallback to exact-host/same-origin resources.
- LLM requests are bounded and strict-output parsed. Heuristic fallback and user
  review keep AI advisory rather than authoritative.
- Extension auth is a public-client PKCE flow restricted to the bundled extension
  ID. Codes are hashed, five-minute and single-use; bearer tokens are hashed,
  scoped to job write plus account identity read, extension/installation-bound,
  revocable, and expire after 90 days.
- DOM payloads are previewed before explicit Save, strict/bounded to 64 KB, and
  stored as user-owned PRIVATE jobs with extension-specific provenance. The
  extension never receives a web session/password and cannot create Applications.

## Honest Residuals

- Process-local rate limits reset on process restart and do not coordinate
  replicas. Proxy IP headers also depend on trusted deployment configuration.
- Live portal redirects, anti-bot behavior, and Playwright fallback require
  external verification; controls do not guarantee third-party availability.
- Prompt injection remains possible because CV/JD text is untrusted input.
  Strict output parsing is not semantic truth; users must review extraction,
  scores, keywords, and cover letters before acting.
- Ownerless legacy orphan Jobs are deliberately hidden, not automatically
  assigned or deleted. Administrative cleanup is not implemented.
- Email is absent: no Resend/Nodemailer, send endpoint, recipient policy, or
  EmailLog writes. OD-003 must close before that boundary is introduced.
- No browser E2E, deployed Docker smoke, MinIO E2E, or live-source E2E currently
  validates the full operational boundary.
- A public Manifest key stabilizes the unpacked extension ID but is not equivalent
  to Chrome Web Store signing. Installation detection applies only to the current
  browser through a domain-restricted external-message handshake.

See `implementation-audit.md` for code references and verification scope.

## Non-Goals

- Fully protecting a compromised user account
- Bypassing portal terms or anti-bot controls
- Auto-apply/login bots for third-party portals
