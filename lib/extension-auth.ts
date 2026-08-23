import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const EXTENSION_SCOPE =
  "extension:jobs:write extension:account:read";
export const EXTENSION_AUTH_CODE_TTL_MS = 5 * 60 * 1000;
export const EXTENSION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const BUNDLED_EXTENSION_ID = "lokhjkfokakakehiojciicjhfokmkldg";

const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const EXTENSION_ID_PATTERN = "[a-p]{32}";
const REDIRECT_URI_PATTERN = new RegExp(
  `^https://${EXTENSION_ID_PATTERN}\\.chromiumapp\\.org/connected$`,
);
const EXTENSION_ORIGIN_PATTERN = new RegExp(
  `^chrome-extension://${EXTENSION_ID_PATTERN}$`,
);

export function getExtensionIdFromRedirectUri(value: string): string | null {
  if (!REDIRECT_URI_PATTERN.test(value)) return null;
  const extensionId = new URL(value).hostname.slice(0, -".chromiumapp.org".length);
  return extensionId === BUNDLED_EXTENSION_ID ? extensionId : null;
}

export function getExtensionIdFromOrigin(value: string | null): string | null {
  if (!value || !EXTENSION_ORIGIN_PATTERN.test(value)) return null;
  const extensionId = value.slice("chrome-extension://".length);
  return extensionId === BUNDLED_EXTENSION_ID ? extensionId : null;
}

export function generateExtensionSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidExtensionInstallationId(value: string): boolean {
  return SECRET_PATTERN.test(value);
}

export function hashExtensionSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function createPkceS256Challenge(verifier: string): string | null {
  if (!isValidPkceVerifier(verifier)) return null;
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function verifyPkceS256(
  verifier: string,
  expectedChallenge: string,
): boolean {
  if (
    !isValidPkceVerifier(verifier) ||
    !isValidPkceChallenge(expectedChallenge)
  ) {
    return false;
  }
  const actualChallenge = createPkceS256Challenge(verifier);
  if (!actualChallenge) return false;
  return timingSafeEqual(
    Buffer.from(actualChallenge, "ascii"),
    Buffer.from(expectedChallenge, "ascii"),
  );
}

export function isValidPkceVerifier(value: string): boolean {
  return PKCE_VERIFIER_PATTERN.test(value);
}

export function isValidPkceChallenge(value: string): boolean {
  return PKCE_CHALLENGE_PATTERN.test(value);
}

export function isValidExtensionState(value: string): boolean {
  return STATE_PATTERN.test(value);
}

export function isValidExtensionRedirectUri(value: string): boolean {
  return getExtensionIdFromRedirectUri(value) !== null;
}

export function isValidExtensionOrigin(value: string | null): value is string {
  return getExtensionIdFromOrigin(value) !== null;
}

export function extensionOriginMatchesRedirectUri(
  origin: string,
  redirectUri: string,
): boolean {
  if (!isValidExtensionOrigin(origin) || !isValidExtensionRedirectUri(redirectUri)) {
    return false;
  }
  const originId = getExtensionIdFromOrigin(origin);
  return originId !== null && originId === getExtensionIdFromRedirectUri(redirectUri);
}

export function parseExtensionBearerToken(
  authorization: string | null,
): string | null {
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization);
  return match && SECRET_PATTERN.test(match[1]) ? match[1] : null;
}

export function extensionCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}
