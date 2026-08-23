// Single source of truth for the NextAuth session cookie name so the cookie
// set at login and the cookie read in `proxy.ts` (middleware) always match —
// behind a TLS-terminating proxy the auto secure-detection can otherwise make
// them disagree (`authjs.session-token` vs `__Secure-authjs.session-token`),
// which bounces authenticated users back to /login.
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
