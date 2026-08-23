import { test } from "node:test"
import assert from "node:assert/strict"

import { getExtensionHandoff } from "../components/job-fetcher"

test("accepts an extension handoff for supported HTTPS job portals", () => {
  const jobUrl = "https://www.jobstreet.co.id/id/job/123?ref=search"
  const query = new URLSearchParams({ source: "extension", url: jobUrl })

  assert.equal(getExtensionHandoff(`?${query}`), jobUrl)
})

test("rejects unsupported, insecure, and non-extension handoffs", () => {
  assert.equal(
    getExtensionHandoff("?source=extension&url=https%3A%2F%2Fexample.com%2Fjob"),
    null,
  )
  assert.equal(
    getExtensionHandoff("?source=extension&url=http%3A%2F%2Fglints.com%2Fjob"),
    null,
  )
  assert.equal(
    getExtensionHandoff("?source=other&url=https%3A%2F%2Fglints.com%2Fjob"),
    null,
  )
})
