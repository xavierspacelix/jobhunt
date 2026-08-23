import assert from "node:assert/strict";
import { test } from "node:test";

import { safeCallbackUrl } from "../lib/auth-callback";
import {
  extensionConnectCsp,
  isProtectedPath,
  protectedCallbackPath,
} from "../proxy";

test("extension authorization CSP uses a nonce", () => {
  const csp = extensionConnectCsp("testnonce");
  assert.match(csp, /script-src 'self' 'nonce-testnonce' 'strict-dynamic'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
});

test("all authenticated application pages are protected", () => {
  for (const pathname of [
    "/dashboard",
    "/dashboard/detail",
    "/profile",
    "/jobs",
    "/jobs/example",
    "/tracker",
    "/extension/connect",
  ]) {
    assert.equal(isProtectedPath(pathname), true, pathname);
  }
  assert.equal(isProtectedPath("/login"), false);
  assert.equal(isProtectedPath("/register"), false);
});

test("authentication callback preserves extension OAuth parameters", () => {
  const url = new URL(
    "https://jobhunter.test/extension/connect?redirect_uri=https%3A%2F%2Fexample.chromiumapp.org%2Fcallback&state=oauth-state&code_challenge=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ",
  );
  const callback = protectedCallbackPath(url);

  assert.equal(callback, `${url.pathname}${url.search}`);
  assert.equal(safeCallbackUrl(callback, url.origin), callback);
});

test("authentication callback preserves a protected handoff query", () => {
  const url = new URL(
    "https://jobhunter.test/jobs?url=https%3A%2F%2Fglints.com%2Fjob&source=extension",
  );
  const callback = protectedCallbackPath(url);
  assert.equal(
    callback,
    "/jobs?url=https%3A%2F%2Fglints.com%2Fjob&source=extension",
  );
  assert.equal(safeCallbackUrl(callback, url.origin), callback);
});

test("authentication callback rejects cross-origin and malformed values", () => {
  const origin = "https://jobhunter.test";
  assert.equal(safeCallbackUrl("//evil.test/path", origin), "/dashboard");
  assert.equal(safeCallbackUrl("https://evil.test/path", origin), "/dashboard");
  assert.equal(safeCallbackUrl("/\\evil.test/path", origin), "/dashboard");
  assert.equal(safeCallbackUrl(null, origin), "/dashboard");
});
