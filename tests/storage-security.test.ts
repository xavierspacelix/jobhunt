import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { resolveLocalCvPath } from "../lib/storage";

test("local CV paths stay inside uploads/cvs", () => {
  const valid = resolveLocalCvPath("uploads/cvs/user.pdf");
  assert.equal(valid, path.join(process.cwd(), "uploads", "cvs", "user.pdf"));
});

test("local CV paths reject nested, traversal, absolute, and root paths", () => {
  assert.equal(resolveLocalCvPath("uploads/cvs/nested/user.pdf"), null);
  assert.equal(resolveLocalCvPath("uploads/cvs/../../secret.pdf"), null);
  assert.equal(resolveLocalCvPath("uploads/cvs/../secret.pdf"), null);
  assert.equal(resolveLocalCvPath("/etc/passwd"), null);
  assert.equal(resolveLocalCvPath("uploads/cvs"), null);
  assert.equal(resolveLocalCvPath("uploads/cvs-evil/user.pdf"), null);
});
