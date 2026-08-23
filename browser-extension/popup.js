const BASE_URL = globalThis.JOB_HUNTER_BASE_URL;
const TOKEN_KEY = "jobHunterAccessToken";
const TOKEN_ORIGIN_KEY = "jobHunterTokenOrigin";
const TOKEN_EXPIRES_AT_KEY = "jobHunterTokenExpiresAt";

const elements = {
  accountName: document.querySelector("#account-name"),
  accountPanel: document.querySelector("#account-panel"),
  authPanel: document.querySelector("#auth-panel"),
  connect: document.querySelector("#connect"),
  connectionBadge: document.querySelector("#connection-badge"),
  disconnect: document.querySelector("#disconnect"),
  listingHint: document.querySelector("#listing-hint"),
  listingPanel: document.querySelector("#listing-panel"),
  listingProgress: document.querySelector("#listing-progress"),
  listingResults: document.querySelector("#listing-results"),
  pageMessage: document.querySelector("#page-message"),
  pageState: document.querySelector("#page-state"),
  pageHeading: document.querySelector("#page-heading"),
  preview: document.querySelector("#preview"),
  previewCompany: document.querySelector("#preview-company"),
  previewDescription: document.querySelector("#preview-description"),
  previewExtra: document.querySelector("#preview-extra"),
  previewLocation: document.querySelector("#preview-location"),
  previewSalary: document.querySelector("#preview-salary"),
  locationRow: document.querySelector("#location-row"),
  salaryRow: document.querySelector("#salary-row"),
  previewSource: document.querySelector("#preview-source"),
  previewTitle: document.querySelector("#preview-title"),
  save: document.querySelector("#save"),
  scrape: document.querySelector("#scrape"),
  status: document.querySelector("#status"),
  tabDetail: document.querySelector("#tab-detail"),
  tabListing: document.querySelector("#tab-listing"),
  cvWarning: document.querySelector("#cv-warning"),
  cvLink: document.querySelector("#cv-link"),
  reviewPanel: document.querySelector("#review-panel"),
  reviewList: document.querySelector("#review-list"),
  skipReview: document.querySelector("#skip-review"),
};

let accessToken = null;
let tokenOrigin = null;
let activeTabId = null;
let activeTabUrl = null;
let currentMode = "detail";
let parsedJob = null;
let saving = false;
let tokenExpiresAt = null;
let scraping = false;
let hasCv = null;
let reviewQueue = [];
let pendingDecision = null;
let cvMissing = false;

function setStatus(message, kind = "info") {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
  elements.status.setAttribute("role", kind === "error" ? "alert" : "status");
}

function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? busyLabel : idleLabel;
}

// "detail" = single job detail page; "listing" = search results page.
function getPageKind(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    const isGlints = host === "glints.com" || host.endsWith(".glints.com");
    const isJobstreet = ["id.jobstreet.com", "jobstreet.co.id", "jobstreet.com"].some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
    if (isGlints) {
      const match = path.match(/\/id\/opportunities\/jobs\/([^/]+)/);
      if (match && !["recommended", "explore", "search"].includes(match[1])) {
        return "detail";
      }
      if (path.startsWith("/id/opportunities/jobs/")) return "listing";
      return null;
    }
    if (isJobstreet) {
      if (/\/id\/job\/[^/]+/.test(path) || /\/id\/joblisting\/[^/]+/.test(path)) {
        return "detail";
      }
      if (path.startsWith("/id/jobs")) return "listing";
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

function updateAuthUi(user = null) {
  if (user && typeof user.hasProfile === "boolean") hasCv = user.hasProfile;
  const connected = Boolean(accessToken);
  elements.connectionBadge.textContent = connected ? "Terhubung" : "Belum terhubung";
  elements.connectionBadge.dataset.connected = String(connected);
  elements.authPanel.hidden = connected;
  elements.accountPanel.hidden = !connected;
  elements.accountName.textContent =
    user?.email || user?.name || (connected ? "Akun Job Hunter terhubung" : "Akun Job Hunter");
  elements.save.disabled = !connected || !parsedJob || saving;
  if (currentMode === "listing") {
    elements.scrape.disabled = !connected || scraping;
  }
  updateCvWarning();
}

function updateCvWarning() {
  if (!elements.cvWarning) return;
  const show = Boolean(accessToken) && hasCv === false;
  elements.cvWarning.hidden = !show;
  if (show && elements.cvLink) {
    elements.cvLink.href = `${BASE_URL}`;
  }
}

async function clearToken(message) {
  accessToken = null;
  tokenOrigin = null;
  await chrome.storage.local.remove([TOKEN_KEY, TOKEN_ORIGIN_KEY, TOKEN_EXPIRES_AT_KEY]);
  updateAuthUi();
  if (message) setStatus(message, "error");
}

async function requestCurrentUser() {
  if (!accessToken) {
    updateAuthUi();
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/extension/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (response.status === 401) {
      await clearToken("Sesi koneksi berakhir. Hubungkan akun kembali.");
      return null;
    }
    if (!response.ok) throw new Error("unavailable");
    const user = await response.json();
    updateAuthUi(user);
    return user;
  } catch {
    updateAuthUi();
    setStatus(
      "Koneksi tersimpan, tetapi detail akun belum dapat diverifikasi. Anda tetap dapat mencoba menyimpan.",
      "error",
    );
    return null;
  }
}

async function connectAccount() {
  setBusy(elements.connect, true, "Menghubungkan...", "Hubungkan akun");
  setStatus("Membuka halaman masuk Job Hunter...");
  try {
    const result = await chrome.runtime.sendMessage({ type: "JOBHUNTER_CONNECT" });
    if (!result?.ok || !result.connection?.accessToken) {
      throw new Error(result?.error || "Koneksi akun gagal.");
    }
    accessToken = result.connection.accessToken;
    tokenOrigin = result.connection.tokenOrigin;
    tokenExpiresAt = result.connection.expiresAt;
    updateAuthUi();
    const user = await requestCurrentUser();
    if (user) setStatus("Akun terhubung. Lowongan siap disimpan.", "success");
  } catch (error) {
    if (!accessToken) updateAuthUi();
    setStatus(error instanceof Error ? error.message : "Koneksi akun gagal.", "error");
  } finally {
    elements.connect.disabled = false;
    elements.connect.setAttribute("aria-busy", "false");
    elements.connect.textContent = "Hubungkan akun";
  }
}

// Shared extraction logic. Runs against any Document (live DOM or a parsed
// fetch response) for the given absolute job URL.
function scrapeJobFromDocument(doc = document, urlString = location.href) {
  const LIMITS = {
    title: 300,
    company: 300,
    location: 300,
    salary: 200,
    description: 50000,
    detail: 2000,
    about: 5000,
    address: 500,
    short: 200,
    category: 300,
    recruiter: 300,
    url: 2048,
    skills: 50,
  };

  const clean = (value, max) => {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const normalized = String(value).replace(/\s+/g, " ").trim();
    return normalized ? normalized.slice(0, max) : null;
  };
  const cleanDescription = (value) => {
    if (typeof value !== "string") return null;
    const entities = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: '"',
    };
    const text = value
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (match, entity) => {
        if (entity[0] === "#") {
          const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
          const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
          const codePoint = Number.parseInt(digits, radix);
          return Number.isFinite(codePoint) && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : " ";
        }
        return entities[entity.toLowerCase()] || match;
      })
      .replace(/[\t ]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text ? text.slice(0, LIMITS.description) : null;
  };
  const firstText = (selectors, max) => {
    for (const selector of selectors) {
      try {
        const value = clean(doc.querySelector(selector)?.textContent, max);
        if (value) return value;
      } catch {
        // Ignore portal selector changes and continue through safe fallbacks.
      }
    }
    return null;
  };
  const meta = (keys, max) => {
    for (const key of keys) {
      const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key;
      const node =
        doc.querySelector(`meta[property="${escaped}"]`) ||
        doc.querySelector(`meta[name="${escaped}"]`);
      const value = clean(node?.getAttribute("content"), max);
      if (value) return value;
    }
    return null;
  };
  const scalar = (value, max) => {
    if (Array.isArray(value)) {
      return clean(value.map((item) => scalar(item, max)).filter(Boolean).join(", "), max);
    }
    if (value && typeof value === "object") {
      return scalar(value.name || value.value || value.description, max);
    }
    const text = clean(value, max);
    return text ? clean(cleanDescription(text), max) : null;
  };
  const addressText = (value) => {
    const locations = Array.isArray(value) ? value : value ? [value] : [];
    const parts = [];
    for (const location of locations) {
      const address = location?.address || location;
      if (typeof address === "string") parts.push(address);
      else if (address && typeof address === "object") {
        parts.push(
          [address.addressLocality, address.addressRegion, address.addressCountry]
            .map((part) => scalar(part, 100))
            .filter(Boolean)
            .join(", "),
        );
      }
    }
    return clean(parts.filter(Boolean).join("; "), LIMITS.location);
  };
  const salaryText = (value) => {
    if (!value) return null;
    if (typeof value === "string" || typeof value === "number") {
      return clean(value, LIMITS.salary);
    }
    const currency = scalar(value.currency, 20);
    const amount = value.value && typeof value.value === "object" ? value.value : value;
    const min = scalar(amount.minValue, 50);
    const max = scalar(amount.maxValue, 50);
    const exact = scalar(amount.value, 50);
    const unit = scalar(amount.unitText, 50);
    const range = min && max ? `${min} - ${max}` : exact || min || max;
    return clean([currency, range, unit].filter(Boolean).join(" "), LIMITS.salary);
  };
  const collectSkills = (value) => {
    const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;|\n]/) : [];
    return [...new Set(raw.map((item) => scalar(item, LIMITS.short)).filter(Boolean))].slice(
      0,
      LIMITS.skills,
    );
  };
  const validDate = (value) => {
    const text = scalar(value, 100);
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };
  const safeHttpUrl = (value) => {
    const text = scalar(value, LIMITS.url);
    if (!text) return null;
    try {
      const url = new URL(text, location.origin);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  };
  const findJobPosting = (value, seen = new Set(), depth = 0) => {
    if (
      !value ||
      typeof value !== "object" ||
      seen.has(value) ||
      depth > 50 ||
      seen.size > 10000
    ) {
      return null;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findJobPosting(item, seen, depth + 1);
        if (found) return found;
      }
      return null;
    }
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some((type) => String(type).toLowerCase() === "jobposting")) return value;
    for (const child of Object.values(value)) {
      const found = findJobPosting(child, seen, depth + 1);
      if (found) return found;
    }
    return null;
  };
  const labelValue = (labels, max) => {
    const wanted = labels.map((label) => label.toLowerCase());
    for (const node of doc.querySelectorAll("dt, h2, h3, h4, strong, span, div")) {
      const label = clean(node.textContent, 100)?.toLowerCase();
      if (!label || !wanted.some((item) => label === item || label.startsWith(`${item}:`))) continue;
      const sibling = node.nextElementSibling;
      const value = clean(sibling?.textContent, max);
      if (value) return value;
      if (label.includes(":")) {
        const inline = clean(label.slice(label.indexOf(":") + 1), max);
        if (inline) return inline;
      }
    }
    return null;
  };

  const bodyText = (doc.body?.innerText || "")
    .replace(/[\t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  const matchSalary = (text) => {
    if (!text) return null;
    const m = text.match(
      /(?:Rp\.?|IDR)\s?[\d.,]+\s?(?:[–-]\s?(?:Rp\.?|IDR)\s?[\d.,]+)?\s?(?:juta|jt|ribu|rb|m|k)?/i,
    );
    return m ? clean(m[0], LIMITS.salary) : null;
  };
  const matchLocationFromText = (text) => {
    if (!text) return null;
    for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
      if (/^(?:lokasi|location|tempat|penempatan)\b/i.test(line) || /^(?:lokasi|location)\s*:/i.test(line)) {
        const val = line.replace(/^(?:lokasi|location|tempat|penempatan)\s*:?\s*/i, "").trim();
        if (val && val.length <= LIMITS.location) return clean(val, LIMITS.location);
      }
    }
    return null;
  };

  let currentUrl;
  try {
    currentUrl = new URL(urlString);
  } catch {
    throw new Error("URL halaman tidak valid.");
  }
  currentUrl.hash = "";
  for (const key of [...currentUrl.searchParams.keys()]) {
    if (/^(?:utm_|ref$|referrer$|tracking|trackingid|source$)/i.test(key)) {
      currentUrl.searchParams.delete(key);
    }
  }
  if (currentUrl.hash.length) currentUrl.hash = "";
  if (currentUrl.href.length > LIMITS.url) currentUrl.search = "";
  if (currentUrl.href.length > LIMITS.url) {
    throw new Error("URL lowongan melebihi batas yang didukung.");
  }
  const host = currentUrl.hostname.toLowerCase();
  const path = currentUrl.pathname.toLowerCase();
  const glints = host === "glints.com" || host.endsWith(".glints.com");
  const jobstreet = ["id.jobstreet.com", "jobstreet.co.id", "jobstreet.com"].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  const isDetail =
    (glints && /\/(?:opportunities\/)?jobs\//.test(path)) ||
    (jobstreet && (/\/id\/job\/[^/]+/.test(path) || /\/id\/joblisting\/[^/]+/.test(path)));
  if (currentUrl.protocol !== "https:" || !isDetail) {
    throw new Error("Halaman ini bukan detail lowongan yang didukung.");
  }

  let posting = null;
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = script.textContent || "";
      if (json.length > 1000000) continue;
      posting = findJobPosting(JSON.parse(json));
      if (posting) break;
    } catch {
      // Invalid JSON-LD is untrusted page data; DOM fallbacks remain available.
    }
  }

  const organization = posting?.hiringOrganization;
  const companyDetails = {};
  if (organization && typeof organization === "object" && !Array.isArray(organization)) {
    const knownDetails = {
      name: scalar(organization.name, LIMITS.company),
      about: scalar(organization.description, LIMITS.about),
      industry: scalar(organization.industry, LIMITS.category),
      size: scalar(organization.numberOfEmployees, LIMITS.short),
      address: scalar(
        addressText(organization.location || organization.address),
        LIMITS.address,
      ),
    };
    for (const [key, value] of Object.entries(knownDetails)) {
      if (value) companyDetails[key] = value;
    }
    const website = safeHttpUrl(organization.url);
    if (website) companyDetails.website = website;
    const links = Array.isArray(organization.sameAs) ? organization.sameAs : [organization.sameAs];
    for (const value of links) {
      const link = safeHttpUrl(value);
      if (!link) continue;
      if (/linkedin\.com/i.test(link)) companyDetails.linkedin = link;
      else if (/instagram\.com/i.test(link)) companyDetails.instagram = link;
      else if (/(?:twitter|x)\.com/i.test(link)) companyDetails.twitter = link;
      else if (/facebook\.com/i.test(link)) companyDetails.facebook = link;
    }
  }

  const source = glints ? "GLINTS" : "JOBSTREET";
  const title =
    scalar(posting?.title, LIMITS.title) ||
    firstText(
      ['[data-automation="job-detail-title"]', "h1"],
      LIMITS.title,
    ) ||
    meta(["og:title", "twitter:title"], LIMITS.title);
  if (!title) throw new Error("Judul lowongan tidak ditemukan pada halaman ini.");

  const description =
    cleanDescription(posting?.description) ||
    cleanDescription(
      firstText(
        [
          '[data-automation="jobAdDetails"]',
          '[data-testid="job-description"]',
          "main article",
          "article",
          "main",
          '[class*="description" i]',
        ],
        LIMITS.description,
      ),
    ) ||
    cleanDescription(meta(["description", "og:description"], LIMITS.description));
  const company =
    scalar(organization, LIMITS.company) ||
    firstText(
      [
        '[data-automation="advertiser-name"]',
        '[data-automation="job-detail-company"]',
        'a[href*="/companies/"]',
        'a[href*="/company/"]',
        "h1 a",
        '[class*="company" i]',
      ],
      LIMITS.company,
    ) ||
    meta(["og:site_name"], LIMITS.company) ||
    "";
  const locationText =
    addressText(posting?.jobLocation) ||
    scalar(posting?.jobLocation?.name, LIMITS.location) ||
    firstText(
      [
        '[data-automation="job-detail-location"]',
        '[data-testid="job-location"]',
        '[itemprop="jobLocation"]',
        'nav[aria-label="Breadcrumb"] a:last-child',
      ],
      LIMITS.location,
    ) ||
    labelValue(["lokasi", "location", "tempat", "address"], LIMITS.location) ||
    matchLocationFromText(bodyText);
  const salary =
    salaryText(posting?.baseSalary) ||
    firstText(
      ['[data-automation="job-detail-salary"]', '[data-testid="job-salary"]'],
      LIMITS.salary,
    ) ||
    labelValue(["gaji", "salary"], LIMITS.salary) ||
    matchSalary(bodyText);
  const externalMatch = glints
    ? currentUrl.pathname.match(/\/jobs\/(?:[^/]+\/)?([^/]+)\/?$/i)
    : currentUrl.pathname.match(/\/(?:id\/job|id\/joblisting)\/([^/]+)/i);

  return {
    sourceUrl: currentUrl.href,
    source,
    title,
    company,
    location: locationText,
    salary,
    description,
    postedAt:
      validDate(posting?.datePosted) ||
      validDate(doc.querySelector("time[datetime]")?.getAttribute("datetime")),
    employmentType:
      scalar(posting?.employmentType, LIMITS.short) ||
      firstText(['[data-automation="job-detail-work-type"]'], LIMITS.short) ||
      labelValue(["jenis pekerjaan", "tipe pekerjaan", "work type"], LIMITS.short),
    experience:
      scalar(posting?.experienceRequirements, LIMITS.short) ||
      scalar(posting?.experienceRequirements?.monthsOfExperience, LIMITS.short) ||
      labelValue(["pengalaman", "experience"], LIMITS.short),
    education:
      scalar(posting?.educationRequirements, LIMITS.short) ||
      scalar(posting?.educationRequirements?.credentialCategory, LIMITS.short) ||
      labelValue(["pendidikan", "education"], LIMITS.short),
    category:
      scalar(posting?.occupationalCategory || posting?.industry, LIMITS.category) ||
      labelValue(["kategori", "category", "industri", "industry"], LIMITS.category),
    recruiter: labelValue(["rekruter", "recruiter", "posted by"], LIMITS.recruiter),
    skills: collectSkills(posting?.skills),
    externalJobId: scalar(externalMatch?.[1] || posting?.identifier, LIMITS.short),
    companyDetails: Object.keys(companyDetails).length ? companyDetails : null,
    debug: {
      hasJobPostingLd: Boolean(posting),
      jobPostingKeys: posting ? Object.keys(posting) : [],
      h1: clean(doc.querySelector("h1")?.textContent, 120),
      bodySalaryMatch: matchSalary(bodyText),
      selectors: {
        jobDetailTitle: Boolean(doc.querySelector('[data-automation="job-detail-title"]')),
        jobAdDetails: Boolean(doc.querySelector('[data-automation="jobAdDetails"]')),
        companiesLink: Boolean(doc.querySelector('a[href*="/companies/"]')),
        breadcrumb: Boolean(doc.querySelector('nav[aria-label="Breadcrumb"] a')),
      },
    },
  };
}

function renderPreview(job) {
  elements.preview.hidden = false;
  elements.previewSource.textContent = job.source === "GLINTS" ? "Glints" : "Jobstreet";
  elements.previewTitle.textContent = job.title;
  elements.previewCompany.textContent = job.company || "Perusahaan tidak tercantum";
  elements.locationRow.hidden = !job.location;
  elements.previewLocation.textContent = job.location || "";
  elements.salaryRow.hidden = !job.salary;
  elements.previewSalary.textContent = job.salary || "";
  elements.previewDescription.textContent =
    job.description || "Deskripsi tidak tersedia pada DOM halaman.";
  elements.previewExtra.replaceChildren();
  const details = [
    ["URL sumber", job.sourceUrl],
    ["Tanggal posting", job.postedAt],
    ["Tipe pekerjaan", job.employmentType],
    ["Pengalaman", job.experience],
    ["Pendidikan", job.education],
    ["Kategori", job.category],
    ["Perekrut", job.recruiter],
    ["Keahlian", job.skills?.join(", ")],
    ["Referensi portal", job.externalJobId],
    ["Detail perusahaan", job.companyDetails ? JSON.stringify(job.companyDetails) : null],
    ["Diagnostic", job.debug ? JSON.stringify(job.debug) : null],
  ];
  for (const [label, value] of details) {
    if (!value) continue;
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    elements.previewExtra.append(row);
  }
  elements.save.disabled = !accessToken || saving;
}

async function scrapeActiveTab() {
  if (!activeTabId) return;
  pendingDecision = null;
  elements.skipReview.hidden = true;
  elements.save.textContent = "Simpan ke Job Hunter";
  setStatus("Mengambil detail lowongan dari halaman...");
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: scrapeJobFromDocument,
    });
    const result = results?.[0];
    if (!result || result.error || !result.result) {
      throw new Error("Detail lowongan tidak dapat dibaca dari halaman.");
    }
    parsedJob = result.result;
    renderPreview(parsedJob);
    setStatus("Tinjau preview, lalu simpan jika datanya sudah sesuai.");
  } catch (error) {
    parsedJob = null;
    elements.save.disabled = true;
    setStatus(error instanceof Error ? error.message : "Scrape halaman gagal.", "error");
  }
}

async function saveJob() {
  if (!parsedJob || !accessToken || saving) return;
  saving = true;
  const decision = pendingDecision;
  setBusy(elements.save, true, "Menyimpan...", "Simpan ke Job Hunter");
  setStatus("Menyimpan lowongan ke akun Anda...");
  try {
    const safeJob = { ...parsedJob };
    delete safeJob.debug;
    if (decision) {
      if (decision.forceSave) safeJob.forceSave = true;
      if (decision.skipMatch) safeJob.skipMatch = true;
    }
    const response = await fetch(`${BASE_URL}/api/extension/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safeJob),
    });
    if (response.status === 401) {
      await clearToken("Sesi koneksi berakhir. Hubungkan akun kembali.");
      return;
    }
    if (!response.ok) {
      throw new Error(
        response.status === 400 || response.status === 422
          ? "Data preview tidak dapat disimpan. Muat ulang halaman dan coba lagi."
          : "Job Hunter belum dapat menyimpan lowongan.",
      );
    }
    const payload = await response.json();
    if (!payload || (typeof payload.saved !== "boolean" && !payload.job)) {
      throw new Error("Respons penyimpanan tidak valid.");
    }
    if (payload.saved) {
      pendingDecision = null;
      elements.skipReview.hidden = true;
      setStatus(
        payload.matchScore != null
          ? `Tersimpan. Skor AI: ${payload.matchScore}.`
          : "Lowongan berhasil disimpan ke Job Hunter.",
        "success",
      );
      elements.save.textContent = "Tersimpan";
      return;
    }
    if (payload.review) {
      pendingDecision = { forceSave: true };
      elements.save.textContent = `Simpan tetap (AI ${payload.matchScore})`;
      elements.save.disabled = false;
      elements.skipReview.hidden = false;
      setStatus(
        `Skor AI ${payload.matchScore} di bawah ambang 70. Simpan tetap atau lewati.`,
        "info",
      );
      return;
    }
    if (payload.needsCv) {
      cvMissing = true;
      updateCvWarning();
      pendingDecision = { skipMatch: true };
      elements.save.textContent = "Simpan tanpa match";
      elements.save.disabled = false;
      elements.skipReview.hidden = false;
      setStatus(
        "Unggah CV di Job Hunter untuk AI match, atau simpan tanpa match.",
        "info",
      );
      return;
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Penyimpanan gagal.", "error");
  } finally {
    saving = false;
    if (pendingDecision) return;
    elements.skipReview.hidden = true;
    if (elements.save.textContent !== "Tersimpan") {
      setBusy(elements.save, false, "Menyimpan...", "Simpan ke Job Hunter");
      elements.save.disabled = !accessToken || !parsedJob;
    } else {
      elements.save.disabled = true;
      elements.save.setAttribute("aria-busy", "false");
    }
  }
}

async function saveJobs(jobs) {
  if (!accessToken) {
    setStatus("Hubungkan akun terlebih dahulu.", "error");
    return;
  }
  let saved = 0;
  let skipped = 0;
  reviewQueue = [];
  cvMissing = false;
  elements.listingResults.replaceChildren();
  elements.reviewList.replaceChildren();
  elements.reviewPanel.hidden = true;
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const safeJob = { ...job };
    delete safeJob.debug;
    setStatus(`Memeriksa ${i + 1}/${jobs.length}: ${job.title || "lowongan"}`);
    try {
      const response = await fetch(`${BASE_URL}/api/extension/jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(safeJob),
      });
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.review) {
          reviewQueue.push({
            job,
            matchScore: payload.matchScore,
            matchedSkills: payload.matchedSkills,
            missingSkills: payload.missingSkills,
          });
          renderListingRow(job, `Tinjau (AI ${payload.matchScore})`);
        } else if (payload?.needsCv) {
          cvMissing = true;
          renderListingRow(job, "Perlu CV");
        } else if (payload?.saved) {
          saved += 1;
          renderListingRow(
            job,
            payload.matchScore != null ? `Tersimpan (AI ${payload.matchScore})` : "Tersimpan",
          );
        } else {
          skipped += 1;
          renderListingRow(job, "Dilewati");
        }
      } else {
        skipped += 1;
        renderListingRow(job, "Dilewati");
      }
    } catch {
      skipped += 1;
      renderListingRow(job, "Gagal");
    }
  }
  if (cvMissing) updateCvWarning();
  if (reviewQueue.length > 0) {
    renderReviewList();
    elements.reviewPanel.hidden = false;
  }
  setStatus(
    `Selesai. ${saved} tersimpan, ${reviewQueue.length} perlu tinjau, ${skipped} dilewati.`,
    "success",
  );
}

function renderListingRow(job, state) {
  const row = document.createElement("li");
  row.className = "listing-row";
  const title = document.createElement("span");
  title.className = "listing-row-title";
  title.textContent = job.title || "Lowongan";
  const stateEl = document.createElement("span");
  stateEl.className = "listing-row-state";
  stateEl.textContent = state;
  row.append(title, stateEl);
  elements.listingResults.append(row);
}

function renderReviewList() {
  elements.reviewList.replaceChildren();
  reviewQueue.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "listing-row";
    const info = document.createElement("div");
    info.style.minWidth = "0";
    const title = document.createElement("span");
    title.className = "listing-row-title";
    title.textContent = item.job.title || "Lowongan";
    const score = document.createElement("span");
    score.className = "listing-row-state";
    score.textContent = `AI ${item.matchScore}`;
    info.append(title, score);
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.flex = "0 0 auto";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "button primary";
    saveBtn.style.minHeight = "32px";
    saveBtn.style.padding = "4px 10px";
    saveBtn.style.fontSize = "11px";
    saveBtn.textContent = "Simpan";
    saveBtn.addEventListener("click", () => void saveReviewedJob(index));
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "button";
    skipBtn.style.minHeight = "32px";
    skipBtn.style.padding = "4px 10px";
    skipBtn.style.fontSize = "11px";
    skipBtn.textContent = "Lewati";
    skipBtn.addEventListener("click", () => skipReviewedJob(index));
    actions.append(saveBtn, skipBtn);
    row.append(info, actions);
    elements.reviewList.append(row);
  });
}

async function saveReviewedJob(index) {
  const item = reviewQueue[index];
  if (!item) return;
  try {
    const safeJob = { ...item.job };
    delete safeJob.debug;
    safeJob.forceSave = true;
    const response = await fetch(`${BASE_URL}/api/extension/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safeJob),
    });
    if (response.ok) {
      reviewQueue.splice(index, 1);
      renderReviewList();
      if (reviewQueue.length === 0) elements.reviewPanel.hidden = true;
      setStatus("Lowongan disimpan.", "success");
    } else {
      setStatus("Gagal menyimpan lowongan tinjauan.", "error");
    }
  } catch {
    setStatus("Gagal menyimpan lowongan tinjauan.", "error");
  }
}

function skipReviewedJob(index) {
  reviewQueue.splice(index, 1);
  renderReviewList();
  if (reviewQueue.length === 0) elements.reviewPanel.hidden = true;
  setStatus("Lowongan dilewati.", "info");
}

// Collects detail-job URLs from the listing page. Runs in-page (no eval).
function getDetailUrls() {
  const listingHost = location.hostname.toLowerCase();
  const isGlints = listingHost.endsWith("glints.com");
  const isJobstreet =
    listingHost.endsWith("jobstreet.com") || listingHost.endsWith("jobstreet.co.id");
  const urls = new Set();
  // Gather hrefs from anchors, image-map areas, and any element that exposes a
  // URL via a data-href attribute (some SPAs render cards without <a href>).
  const candidates = [];
  for (const el of document.querySelectorAll(
    "a[href], area[href], [data-href], [data-url], [data-job-url], [data-link], [data-job-id], [data-gtm-job-id]",
  )) {
    const href =
      el.getAttribute("href") ||
      el.getAttribute("data-href") ||
      el.getAttribute("data-url") ||
      el.getAttribute("data-job-url") ||
      el.getAttribute("data-link");
    if (href) candidates.push(href);
    const jobId =
      el.getAttribute("data-job-id") || el.getAttribute("data-gtm-job-id");
    if (jobId) {
      // Glints cards expose only the job id (data-gtm-job-id); the canonical
      // detail path is /id/jobs/<id>.
      candidates.push(`https://${listingHost}/id/jobs/${jobId}`);
    }
  }
  let sameSite = 0;
  let pathOk = 0;
  const samples = [];
  for (const href of candidates) {
    if (
      !href ||
      href.startsWith("javascript:") ||
      href.startsWith("#") ||
      href.startsWith("mailto:")
    )
      continue;
    let u;
    try {
      u = new URL(href, location.href);
    } catch {
      continue;
    }
    if (u.protocol !== "https:") continue;
    const h = u.hostname.toLowerCase();
    const p = u.pathname.toLowerCase();
    const onSite = isGlints
      ? h === "glints.com" || h.endsWith(".glints.com")
      : isJobstreet &&
        (h === "id.jobstreet.com" ||
          h.endsWith(".jobstreet.co.id") ||
          h === "jobstreet.com" ||
          h.endsWith(".jobstreet.com"));
    if (!onSite) continue;
    sameSite += 1;
    let ok = false;
    if (isGlints) {
      const m =
        p.match(/\/(?:id\/)?opportunities\/jobs\/([^/?#]+)/) ||
        p.match(/\/(?:id\/)?jobs\/([^/?#]+)/) ||
        p.match(/\/(?:id\/)?lowongan\/([^/?#]+)/);
      ok =
        !!m &&
        !["recommended", "explore", "search", "jobs", "categories", "companies", "lowongan"].includes(
          m[1],
        );
    } else {
      ok =
        /\/id\/job\/[^/?#]+/.test(p) ||
        /\/id\/joblisting\/[^/?#]+/.test(p) ||
        /\/job\/[^/?#]+/.test(p);
    }
    if (ok) {
      urls.add(u.href.split(/[?#]/)[0]);
      pathOk += 1;
    } else if (samples.length < 15) {
      samples.push(p);
    }
  }
  console.log(
    "[getDetailUrls]",
    JSON.stringify({
      host: listingHost,
      isGlints,
      isJobstreet,
      totalCandidates: candidates.length,
      sameSite,
      pathOk,
      samples,
    }),
  );
  return Array.from(urls).slice(0, 50);
}

// Resolves once the page has rendered a job title or JSON-LD (SPAs can take a
// while). Returns false if it times out. Runs in-page (no eval).
function waitForContent() {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      if (
        document.querySelector("h1") ||
        document.querySelector('script[type="application/ld+json"]')
      ) {
        return resolve(true);
      }
      if (n++ > 24) return resolve(false);
      setTimeout(tick, 300);
    };
    tick();
  });
}

// Opens a detail URL in a background tab, waits for it to render, scrapes it
// with the shared extractor (cookies + rendered DOM included), then closes it.
async function scrapeUrlInNewTab(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      };
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === "complete") finish();
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(finish, 20000);
    });
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: waitForContent });
    } catch {
      // Even if the wait probe fails, fall through and try scraping anyway.
    }
    // Read the live URL in case the tab redirected (e.g. consent/login).
    let liveUrl = url;
    try {
      const live = await chrome.tabs.get(tab.id);
      if (live?.url) liveUrl = live.url;
    } catch {
      // ignore; keep original url
    }
    let raw = null;
    let execError = null;
    let resultError = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeJobFromDocument,
      });
      raw = results?.[0]?.result || null;
      if (results?.[0]?.error) {
        resultError = String(results?.[0]?.error);
        execError = resultError;
      }
    } catch (err) {
      execError = err?.message || String(err);
    }
    console.log(
      "[scrape]",
      "requested:",
      url,
      "live:",
      liveUrl,
      "execError:",
      execError,
      "resultError:",
      resultError,
      "raw:",
      JSON.stringify(raw),
    );
    return { job: raw, error: execError };
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      // Tab may already be closed; ignore.
    }
  }
}

function getActiveKind() {
  return activeTabUrl ? getPageKind(activeTabUrl) : null;
}

async function runListing() {
  if (!activeTabId || scraping) return;
  scraping = true;
  setBusy(elements.scrape, true, "Memindai…", "Ambil semua lowongan");
  elements.listingResults.replaceChildren();
  setStatus("Memindai halaman daftar lowongan…");
  try {
    const urlResults = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: getDetailUrls,
    });
    const urls = urlResults?.[0]?.result || [];
    if (!urls.length) {
      setStatus("Tidak ada tautan detail lowongan ditemukan di halaman ini.", "error");
      return;
    }
    const jobs = [];
    let failed = 0;
    let firstFailure = null;
    for (let i = 0; i < urls.length; i++) {
      setStatus(`Memindai ${i + 1}/${urls.length}…`);
      let job = null;
      let err = null;
      try {
        const r = await scrapeUrlInNewTab(urls[i]);
        job = r?.job;
        err = r?.error;
      } catch (e) {
        err = e?.message || String(e);
      }
      if (job && job.title) {
        jobs.push(job);
        renderListingRow(job, "Diambil");
      } else {
        failed += 1;
        renderListingRow({ title: urls[i] }, "Dilewati");
        if (!firstFailure) firstFailure = { url: urls[i], error: err, debug: job?.debug };
      }
    }
    if (!jobs.length) {
      console.log("[listing-first-failure]", JSON.stringify(firstFailure));
      setStatus(
        `Tidak ada detail yang diambil (${failed} gagal dari ${urls.length}). ` +
          `Buka DevTools popup lalu lihat log "[listing-first-failure]".`,
        "error",
      );
      return;
    }
    await saveJobs(jobs);
    setStatus(`Selesai memindai. ${jobs.length} diambil, ${failed} dilewati.`, "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Pemindaian gagal.", "error");
  } finally {
    scraping = false;
    if (currentMode === "listing") {
      setBusy(elements.scrape, false, "Memindai…", "Ambil semua lowongan");
      elements.scrape.disabled = !accessToken;
    }
  }
}

function setMode(mode) {
  currentMode = mode;
  pendingDecision = null;
  cvMissing = false;
  elements.skipReview.hidden = true;
  elements.tabDetail.setAttribute("aria-pressed", String(mode === "detail"));
  elements.tabListing.setAttribute("aria-pressed", String(mode === "listing"));
  const detail = mode === "detail";
  elements.pageState.hidden = !detail;
  elements.save.hidden = !detail;
  elements.listingPanel.hidden = detail;
  if (!detail) elements.preview.hidden = true;
  updateCvWarning();
}

function showNotDetail() {
  elements.pageState.hidden = false;
  elements.pageState.dataset.kind = "error";
  elements.pageHeading.textContent = "Bukan detail lowongan";
  elements.pageMessage.textContent =
    "Buka halaman detail lowongan Glints atau Jobstreet, lalu klik ekstensi lagi.";
  elements.save.disabled = true;
}

function prepareListing(kind) {
  if (kind === "listing") {
    elements.listingHint.textContent =
      "Halaman daftar terdeteksi. Klik untuk mengambil semua lowongan dari halaman ini.";
    elements.scrape.disabled = !accessToken || scraping;
  } else {
    elements.listingHint.textContent =
      "Buka halaman daftar Glints (Jobs Rekomendasi) atau Jobstreet (Jobs) di tab aktif untuk mengambil banyak lowongan sekaligus.";
    elements.scrape.disabled = true;
  }
}

async function initialize() {
  const [local, tabs] = await Promise.all([
    chrome.storage.local.get([TOKEN_KEY, TOKEN_ORIGIN_KEY, TOKEN_EXPIRES_AT_KEY]),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);

  accessToken = typeof local[TOKEN_KEY] === "string" ? local[TOKEN_KEY] : null;
  tokenOrigin = typeof local[TOKEN_ORIGIN_KEY] === "string" ? local[TOKEN_ORIGIN_KEY] : null;
  tokenExpiresAt =
    typeof local[TOKEN_EXPIRES_AT_KEY] === "string" ? local[TOKEN_EXPIRES_AT_KEY] : null;
  if (tokenExpiresAt && new Date(tokenExpiresAt) <= new Date()) await clearToken();
  if (accessToken && tokenOrigin !== BASE_URL) await clearToken();

  const activeTab = tabs[0];
  activeTabId = activeTab?.id ?? null;
  activeTabUrl = activeTab?.url ?? null;
  const kind = getActiveKind();
  const defaultMode = kind === "listing" ? "listing" : "detail";
  setMode(defaultMode);

  if (defaultMode === "detail") {
    if (kind === "detail") await scrapeActiveTab();
    else showNotDetail();
  } else {
    prepareListing(kind);
  }

  if (accessToken) await requestCurrentUser();
  else updateAuthUi();
}

elements.connect.addEventListener("click", connectAccount);
elements.disconnect.addEventListener("click", async () => {
  await clearToken();
  setStatus("Koneksi lokal diputus. Token server dapat dicabut dari dashboard.");
});
elements.save.addEventListener("click", saveJob);
elements.skipReview.addEventListener("click", () => {
  pendingDecision = null;
  elements.skipReview.hidden = true;
  elements.save.textContent = "Simpan ke Job Hunter";
  elements.save.disabled = !accessToken || !parsedJob;
  setStatus("Lewati. Lowongan tidak disimpan.", "info");
});
elements.scrape.addEventListener("click", () => void runListing());
elements.tabDetail.addEventListener("click", () => {
  setMode("detail");
  if (!parsedJob) {
    if (getActiveKind() === "detail") void scrapeActiveTab();
    else showNotDetail();
  }
});
elements.tabListing.addEventListener("click", () => {
  setMode("listing");
  prepareListing(getActiveKind());
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[TOKEN_KEY]) return;
  const nextToken = changes[TOKEN_KEY].newValue;
  accessToken = typeof nextToken === "string" ? nextToken : null;
  updateAuthUi();
  if (accessToken) void requestCurrentUser();
});

initialize().catch(() => {
  elements.pageState.hidden = false;
  elements.pageState.dataset.kind = "error";
  elements.pageHeading.textContent = "Ekstensi tidak siap";
  elements.pageMessage.textContent = "Tab aktif atau koneksi Job Hunter tidak dapat dibaca.";
  elements.save.disabled = true;
  updateAuthUi();
});
