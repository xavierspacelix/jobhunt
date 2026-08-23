import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { test } from "node:test";
import {
  resolvePublicHostname,
  validatePublicHttpUrl,
  isAllowedScraperHostname,
  isPublicIpAddress,
  scraperSourceForHostname,
  validateScraperUrl,
  type DnsLookup,
  type PinnedUrl,
} from "../lib/ssrf";
import { isAllowedBrowserRequest, nativeFetch } from "../lib/scrapers/render";

test("SSRF policy rejects special IPv4 ranges", () => {
  for (const ip of [
    "0.0.0.1",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.31.255.255",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
  ])
    assert.equal(isPublicIpAddress(ip), false, ip);
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
});

test("SSRF policy rejects special IPv6 ranges and mapped IPv4", () => {
  for (const ip of [
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "64:ff9b::1",
    "64:ff9b:1::1",
    "100::1",
    "2001:db8::1",
    "2002::1",
    "3fff::1",
    "5f00::1",
    "fc00::1",
    "fe80::1",
    "fec0::1",
    "ff02::1",
  ])
    assert.equal(isPublicIpAddress(ip), false, ip);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("scraper URL policy retains only Glints and Jobstreet hosts", () => {
  for (const host of [
    "glints.com",
    "id.glints.com",
    "jobstreet.co.id",
    "www.jobstreet.com",
  ]) {
    assert.equal(isAllowedScraperHostname(host), true);
  }
  for (const host of [
    "evilglints.com",
    "glints.com.evil.test",
    "localhost",
    "127.0.0.1",
  ]) {
    assert.equal(isAllowedScraperHostname(host), false);
  }
  assert.equal(scraperSourceForHostname("jobs.glints.com"), "GLINTS");
  assert.equal(scraperSourceForHostname("id.jobstreet.com"), "JOBSTREET");
  assert.equal(scraperSourceForHostname("example.com"), null);
  assert.throws(() => validateScraperUrl("http://glints.com/jobs/1"));
});

test("public subresource policy allows public CDNs but blocks unsafe schemes", () => {
  assert.equal(
    validatePublicHttpUrl("https://cdn.example.com/app.js").hostname,
    "cdn.example.com",
  );
  assert.throws(() => validatePublicHttpUrl("file:///etc/passwd"));
  assert.throws(() => validatePublicHttpUrl("http://127.0.0.1/secret"));
});

test("DNS validation returns the exact selected public address", async () => {
  let requestedHost = "";
  const lookup: DnsLookup = async (hostname, options) => {
    requestedHost = hostname;
    assert.deepEqual(options, { all: true, verbatim: true });
    return [
      { address: "8.8.8.8", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ];
  };

  assert.deepEqual(await resolvePublicHostname("GLINTS.COM.", lookup), {
    address: "8.8.8.8",
    family: 4,
  });
  assert.equal(requestedHost, "glints.com");
});

test("DNS validation rejects a hostname with any private answer", async () => {
  const lookup: DnsLookup = async () => [
    { address: "8.8.8.8", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ];
  await assert.rejects(
    resolvePublicHostname("glints.com", lookup),
    /Private address blocked/,
  );
});

test("native redirects independently resolve and use each pinned address", async () => {
  const resolved: string[] = [];
  const connected: Array<{ hostname: string; address: string }> = [];
  const resolvePinned = async (
    value: string,
    base?: string,
  ): Promise<PinnedUrl> => {
    const url = validateScraperUrl(value, base);
    resolved.push(url.href);
    return {
      url,
      address: resolved.length === 1 ? "8.8.8.8" : "1.1.1.1",
      family: 4,
    };
  };
  const transport = async (target: PinnedUrl) => {
    connected.push({
      hostname: target.url.hostname,
      address: target.address,
    });
    if (connected.length === 1) {
      return {
        status: 302,
        headers: { location: "https://www.glints.com/jobs/2" },
        body: Buffer.alloc(0),
      };
    }
    return {
      status: 200,
      headers: { "content-encoding": "gzip" },
      body: gzipSync("<html>pinned</html>"),
    };
  };

  const result = await nativeFetch(
    "https://glints.com/jobs/1",
    resolvePinned,
    transport,
  );
  assert.deepEqual(resolved, [
    "https://glints.com/jobs/1",
    "https://www.glints.com/jobs/2",
  ]);
  assert.deepEqual(connected, [
    { hostname: "glints.com", address: "8.8.8.8" },
    { hostname: "www.glints.com", address: "1.1.1.1" },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.html, "<html>pinned</html>");
});

test("native redirects reject a different job source", async () => {
  const resolvePinned = async (
    value: string,
    base?: string,
  ): Promise<PinnedUrl> => ({
    url: validateScraperUrl(value, base),
    address: "8.8.8.8",
    family: 4,
  });
  const result = await nativeFetch(
    "https://glints.com/jobs/1",
    resolvePinned,
    async () => ({
      status: 302,
      headers: { location: "https://jobstreet.com/job/2" },
      body: Buffer.alloc(0),
    }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /Cross-source redirect blocked/);
});

test("browser policy permits only the approved origin", () => {
  const initial = new URL("https://glints.com/jobs/1");
  assert.equal(
    isAllowedBrowserRequest(initial, "https://glints.com/assets/app.js"),
    true,
  );
  assert.equal(
    isAllowedBrowserRequest(initial, "https://cdn.example.com/app.js"),
    false,
  );
  assert.equal(
    isAllowedBrowserRequest(initial, "https://www.glints.com/jobs/2"),
    false,
  );
  assert.equal(isAllowedBrowserRequest(initial, "data:text/plain,test"), false);
});

test("redirect targets are resolved and validated before following", () => {
  assert.equal(
    validateScraperUrl("/jobs/2", "https://glints.com/jobs/1").href,
    "https://glints.com/jobs/2",
  );
  assert.equal(
    validateScraperUrl(
      "https://www.jobstreet.co.id/job/2",
      "https://jobstreet.co.id/job/1",
    ).hostname,
    "www.jobstreet.co.id",
  );
  assert.throws(() =>
    validateScraperUrl("https://localhost/admin", "https://glints.com"),
  );
  assert.throws(() =>
    validateScraperUrl("https://evil.test/", "https://glints.com"),
  );
  assert.throws(() =>
    validateScraperUrl("file:///etc/passwd", "https://glints.com"),
  );
  assert.throws(() => validateScraperUrl("https://glints.com:8443/jobs/1"));
});
