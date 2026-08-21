# Trust Model

## Purpose

Web app multi-user dengan data sensitif (CV, lamaran). Definisikan trust boundaries dan protected assets.

## Trust Levels

- **Trusted:** App code, Prisma migrations, verified env secrets, Resend verified domain, OpenAI allowlisted.
- **User-approved:** User's own CV/Jobs/Applications (CRUD own data).
- **Untrusted by default:** Pasted URLs, scraped HTML, LLM output, email bodies from user input, uploaded PDFs.

## Protected Assets

- User data: CV rawText, Profile, Applications
- Auth sessions (NextAuth)
- Secrets: DB url, NextAuth secret, OpenAI key, Resend key
- Email logs (jangan bocorkan ke user lain)

## Boundaries

- **Browser → API:** Auth session required; every query scoped by `userId`.
- **API → Scraper:** Allowlist domains, timeout, no SSRF to internal.
- **API → LLM:** Prompt injection safe: user CV/JD di-escape, JSON schema strict.
- **Upload:** PDF only, 5MB, mime check, no execution.
- **Email:** Only to addresses user controls + follow-up to self; no arbitrary spam.

## Controls

| Threat | Control |
|---|---|
| IDOR (lihat data user lain) | Always filter by session.user.id |
| SSRF via paste URL | Allowlist + block private IP, timeout |
| XSS via JD HTML | Sanitize/dompurify before render |
| Prompt injection via CV | Escape, schema, temp low |
| Spam via email endpoint | Rate limit, ownership check |
| Secret leak | Never log env, redacted errors |

## Non-Goals

- Protect compromised user account fully (but encourage 2FA via Google)
- Bypass portal ToS — scraper respect rate limit
