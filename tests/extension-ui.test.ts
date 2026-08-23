import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExtensionConnectCard } from "../components/extension-connect-card";
import { parseExtensionConnectQuery } from "../components/extension-connect-query";
import {
  ExtensionJobList,
  type ExtensionJob,
} from "../components/extension-job-list";

const validChallenge = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
const extensionId = "lokhjkfokakakehiojciicjhfokmkldg";
const validRedirect = `https://${extensionId}.chromiumapp.org/connected`;
const validState = "s".repeat(32);
const installationId = "i".repeat(43);

test("extension connect query accepts a complete PKCE request", () => {
  const result = parseExtensionConnectQuery(
    new URLSearchParams({
      redirect_uri: validRedirect,
      state: validState,
      code_challenge: validChallenge,
      installation_id: installationId,
    }),
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(
      result.data.redirectUri,
      validRedirect,
    );
    assert.equal(result.data.state, validState);
    assert.equal(result.data.codeChallenge, validChallenge);
    assert.equal(result.data.installationId, installationId);
  }
});

test("extension connect query rejects missing, duplicate, insecure, and invalid values", () => {
  assert.equal(
    parseExtensionConnectQuery(new URLSearchParams()).success,
    false,
  );

  const duplicate = new URLSearchParams({
    redirect_uri: validRedirect,
    state: validState,
    code_challenge: validChallenge,
    installation_id: installationId,
  });
  duplicate.append("state", "second-state");
  assert.equal(parseExtensionConnectQuery(duplicate).success, false);

  assert.equal(
    parseExtensionConnectQuery(
      new URLSearchParams({
        redirect_uri: "http://example.com/callback",
        state: validState,
        code_challenge: validChallenge,
        installation_id: installationId,
      }),
    ).success,
    false,
  );
  assert.equal(
    parseExtensionConnectQuery(
      new URLSearchParams({
        redirect_uri: "https://example.chromiumapp.org/callback",
        state: validState,
        code_challenge: validChallenge,
        installation_id: installationId,
      }),
    ).success,
    false,
  );
  assert.equal(
    parseExtensionConnectQuery(
      new URLSearchParams({
        redirect_uri: validRedirect,
        state: validState,
        code_challenge: "terlalu-pendek",
        installation_id: installationId,
      }),
    ).success,
    false,
  );
});

test("authorize card explains the narrow permission and exposes explicit actions", () => {
  const html = renderToStaticMarkup(
    createElement(ExtensionConnectCard, {
      request: {
        redirectUri: validRedirect,
        state: validState,
        codeChallenge: validChallenge,
        installationId,
      },
    }),
  );

  assert.match(html, /hanya meminta izin untuk menyimpan lowongan/);
  assert.match(html, new RegExp(`ID resmi: ${extensionId}`));
  assert.match(html, />Hubungkan extension</);
  assert.match(html, />Batal</);
});

test("extension jobs render source, origin, match details, and tracker actions", () => {
  const job: ExtensionJob = {
    id: "job-1",
    title: "Frontend Engineer",
    company: "Contoh Teknologi",
    location: "Jakarta",
    salary: "Rp15.000.000",
    source: "GLINTS",
    sourceUrl: "https://glints.com/id/opportunities/jobs/job-1",
    postedAt: "2026-08-20T00:00:00.000Z",
    createdAt: "2026-08-23T00:00:00.000Z",
    matchScore: 82,
    matchedSkills: ["React"],
    missingSkills: ["GraphQL"],
    tracked: false,
  };
  const html = renderToStaticMarkup(
    createElement(ExtensionJobList, { initialJobs: [job] }),
  );

  assert.match(html, /Frontend Engineer/);
  assert.match(html, /Glints/);
  assert.match(html, /Extension/);
  assert.match(html, /82\/100/);
  assert.match(html, /Tambah ke pelacak/);
  assert.match(html, /Buka sumber/);
});

test("extension jobs empty state directs users back to the extension workflow", () => {
  const html = renderToStaticMarkup(
    createElement(ExtensionJobList, { initialJobs: [] }),
  );

  assert.match(html, /Belum ada lowongan dari extension/);
  assert.match(html, /Buka halaman detail lowongan di Glints atau Jobstreet/);
});

test("new jobs list does not call server-side scraping endpoints", () => {
  const source = readFileSync(
    new URL("../components/extension-job-list.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /\/api\/jobs\/(fetch-url|search|recommendations)/,
  );
  assert.doesNotMatch(source, /\/api\/jobs\/recommend-keywords/);
});

test("jobs page renders the saved-job workflow for extension jobs without a scrape tab", () => {
  const page = readFileSync(
    new URL("../app/jobs/page.tsx", import.meta.url),
    "utf8",
  );
  const fetcher = readFileSync(
    new URL("../components/job-fetcher.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /<JobFetcher \/>/);
  assert.doesNotMatch(page, /<ExtensionJobList \/>/);
  assert.doesNotMatch(fetcher, /Cari Rekomendasi/);
  assert.doesNotMatch(fetcher, /\/api\/jobs\/search/);
  assert.doesNotMatch(fetcher, /Input Manual \(Link\)/);
  assert.match(fetcher, /origin === "extension"/);
});

test("extension listing uses an explicit filtered API without changing the default contract", () => {
  const component = readFileSync(
    new URL("../components/extension-job-list.tsx", import.meta.url),
    "utf8",
  );
  const route = readFileSync(new URL("../app/api/jobs/route.ts", import.meta.url), "utf8");
  assert.match(component, /\/api\/jobs\?origin=extension/);
  assert.match(
    route,
    /extensionOnly\s*\?\s*extensionJobsWhere\(user\.id\)\s*:\s*jobVisibilityWhere\(user\.id\)/,
  );
});

test("popup preview and dashboard preserve extension recovery controls", () => {
  const popup = readFileSync(new URL("../browser-extension/popup.js", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");
  const worker = readFileSync(
    new URL("../browser-extension/service-worker.js", import.meta.url),
    "utf8",
  );
  const popupHtml = readFileSync(
    new URL("../browser-extension/popup.html", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(
    readFileSync(new URL("../browser-extension/manifest.json", import.meta.url), "utf8"),
  ) as { name?: string; icons?: Record<string, string>; host_permissions?: string[] };
  assert.match(popup, /\["URL sumber", job\.sourceUrl\]/);
  assert.doesNotMatch(popup, /launchWebAuthFlow/);
  assert.match(dashboard, /headerActions=\{<ExtensionDownloadButton \/>\}/);
  assert.match(worker, /message\?\.type !== "JOBHUNTER_PING"/);
  assert.match(worker, /chrome\.identity\.launchWebAuthFlow/);
  assert.doesNotMatch(popupHtml, /Pengaturan koneksi|base-url|detect-localhost/);
  assert.equal(manifest.name, "Job Hunter");
  assert.equal(manifest.icons?.["128"], "icons/icon-128.png");
  assert.deepEqual(manifest.host_permissions, [
    "https://jobhunt.spacelix.qzz.io/*",
    "https://glints.com/*",
    "https://*.glints.com/*",
    "https://id.jobstreet.com/*",
    "https://*.jobstreet.co.id/*",
    "https://jobstreet.com/*",
    "https://*.jobstreet.com/*",
  ]);
  assert.match(worker, /importScripts\("config\.js"\)/);
  assert.match(popupHtml, /<script src="config\.js"><\/script>/);
});
