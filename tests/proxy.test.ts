import assert from "node:assert/strict";
import { test } from "node:test";

import { safeCallbackUrl } from "../lib/auth-callback";
import { isProtectedPath, protectedCallbackPath } from "../proxy";

test("all authenticated application pages are protected", () => {
  for (const pathname of [
    "/dashboard",
    "/dashboard/detail",
    "/profile",
    "/jobs",
    "/jobs/example",
    "/tracker",
  ]) {
    assert.equal(isProtectedPath(pathname), true, pathname);
  }
  assert.equal(isProtectedPath("/login"), false);
  assert.equal(isProtectedPath("/register"), false);
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
