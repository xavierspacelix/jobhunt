import { test } from "node:test"
import assert from "node:assert/strict"
import {
  STATUS_ORDER,
  STATUS_LABELS,
  isAppStatus,
} from "../lib/kanban"

test("STATUS_ORDER has the 6 pipeline stages in order", () => {
  assert.equal(STATUS_ORDER.length, 6)
  assert.equal(STATUS_ORDER[0], "WISHLIST")
  assert.equal(STATUS_ORDER[STATUS_ORDER.length - 1], "REJECTED")
})

test("STATUS_LABELS maps each status to an Indonesian label", () => {
  assert.equal(STATUS_LABELS.WISHLIST, "Wishlist")
  assert.equal(STATUS_LABELS.APPLIED, "Melamar")
  assert.equal(STATUS_LABELS.SCREENING, "Seleksi")
  assert.equal(STATUS_LABELS.INTERVIEW, "Wawancara")
  assert.equal(STATUS_LABELS.OFFER, "Penawaran")
  assert.equal(STATUS_LABELS.REJECTED, "Ditolak")
})

test("isAppStatus validates only known statuses", () => {
  assert.equal(isAppStatus("WISHLIST"), true)
  assert.equal(isAppStatus("REJECTED"), true)
  assert.equal(isAppStatus("BOGUS"), false)
  assert.equal(isAppStatus(""), false)
  assert.equal(isAppStatus(42), false)
  assert.equal(isAppStatus(null), false)
})
