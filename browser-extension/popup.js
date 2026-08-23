const BASE_URL = globalThis.JOB_HUNTER_BASE_URL
const TOKEN_KEY = "jobHunterAccessToken"
const TOKEN_ORIGIN_KEY = "jobHunterTokenOrigin"
const TOKEN_EXPIRES_AT_KEY = "jobHunterTokenExpiresAt"

const elements = {
  accountName: document.querySelector("#account-name"),
  accountPanel: document.querySelector("#account-panel"),
  authPanel: document.querySelector("#auth-panel"),
  connect: document.querySelector("#connect"),
  connectionBadge: document.querySelector("#connection-badge"),
  disconnect: document.querySelector("#disconnect"),
  locationRow: document.querySelector("#location-row"),
  pageMessage: document.querySelector("#page-message"),
  pageState: document.querySelector("#page-state"),
  pageHeading: document.querySelector("#page-heading"),
  preview: document.querySelector("#preview"),
  previewCompany: document.querySelector("#preview-company"),
  previewDescription: document.querySelector("#preview-description"),
  previewExtra: document.querySelector("#preview-extra"),
  previewLocation: document.querySelector("#preview-location"),
  previewSalary: document.querySelector("#preview-salary"),
  previewSource: document.querySelector("#preview-source"),
  previewTitle: document.querySelector("#preview-title"),
  salaryRow: document.querySelector("#salary-row"),
  save: document.querySelector("#save"),
  status: document.querySelector("#status"),
}

let accessToken = null
let tokenOrigin = null
let activeTabId = null
const baseUrl = BASE_URL
let parsedJob = null
let saving = false
let tokenExpiresAt = null

function setStatus(message, kind = "info") {
  elements.status.textContent = message
  elements.status.dataset.kind = kind
  elements.status.setAttribute("role", kind === "error" ? "alert" : "status")
}

function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy
  button.setAttribute("aria-busy", String(busy))
  button.textContent = busy ? busyLabel : idleLabel
}

function getJobSource(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    const path = url.pathname.toLowerCase()
    const isGlints = host === "glints.com" || host.endsWith(".glints.com")
    const isJobstreet = ["jobstreet.co.id", "jobstreet.com"].some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    )
    if (isGlints && /\/(?:opportunities\/jobs|job)\//.test(path)) return "GLINTS"
    if (isJobstreet && (/\/job\//.test(path) || /\/joblisting\//.test(path))) {
      return "JOBSTREET"
    }
    return null
  } catch {
    return null
  }
}

function updateAuthUi(user = null) {
  const connected = Boolean(accessToken)
  elements.connectionBadge.textContent = connected ? "Terhubung" : "Belum terhubung"
  elements.connectionBadge.dataset.connected = String(connected)
  elements.authPanel.hidden = connected
  elements.accountPanel.hidden = !connected
  elements.accountName.textContent =
    user?.email || user?.name || (connected ? "Akun Job Hunter terhubung" : "Akun Job Hunter")
  elements.save.disabled = !connected || !parsedJob || saving
}

async function clearToken(message) {
  accessToken = null
  tokenOrigin = null
  await chrome.storage.local.remove([TOKEN_KEY, TOKEN_ORIGIN_KEY, TOKEN_EXPIRES_AT_KEY])
  updateAuthUi()
  if (message) setStatus(message, "error")
}

async function requestCurrentUser() {
  if (!accessToken) {
    updateAuthUi()
    return null
  }

  try {
    const response = await fetch(`${baseUrl}/api/extension/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    if (response.status === 401) {
      await clearToken("Sesi koneksi berakhir. Hubungkan akun kembali.")
      return null
    }
    if (!response.ok) throw new Error("unavailable")
    const user = await response.json()
    updateAuthUi(user)
    return user
  } catch {
    updateAuthUi()
    setStatus(
      "Koneksi tersimpan, tetapi detail akun belum dapat diverifikasi. Anda tetap dapat mencoba menyimpan.",
      "error",
    )
    return null
  }
}

async function connectAccount() {
  setBusy(elements.connect, true, "Menghubungkan...", "Hubungkan akun")
  setStatus("Membuka halaman masuk Job Hunter...")
  try {
    const result = await chrome.runtime.sendMessage({ type: "JOBHUNTER_CONNECT" })
    if (!result?.ok || !result.connection?.accessToken) {
      throw new Error(result?.error || "Koneksi akun gagal.")
    }
    accessToken = result.connection.accessToken
    tokenOrigin = result.connection.tokenOrigin
    tokenExpiresAt = result.connection.expiresAt
    updateAuthUi()
    const user = await requestCurrentUser()
    if (user) setStatus("Akun terhubung. Lowongan siap disimpan.", "success")
  } catch (error) {
    if (!accessToken) updateAuthUi()
    setStatus(error instanceof Error ? error.message : "Koneksi akun gagal.", "error")
  } finally {
    setBusy(elements.connect, false, "Menghubungkan...", "Hubungkan akun")
  }
}

// This function is serialized into the active tab. Keep every helper and limit local.
function scrapeJobFromPage() {
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
  }

  const clean = (value, max) => {
    if (typeof value !== "string" && typeof value !== "number") return null
    const normalized = String(value).replace(/\s+/g, " ").trim()
    return normalized ? normalized.slice(0, max) : null
  }
  const cleanDescription = (value) => {
    if (typeof value !== "string") return null
    const entities = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: '"',
    }
    const text = value
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (match, entity) => {
        if (entity[0] === "#") {
          const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10
          const digits = radix === 16 ? entity.slice(2) : entity.slice(1)
          const codePoint = Number.parseInt(digits, radix)
          return Number.isFinite(codePoint) && codePoint <= 0x10ffff
            ? String.fromCodePoint(codePoint)
            : " "
        }
        return entities[entity.toLowerCase()] || match
      })
      .replace(/[\t ]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    return text ? text.slice(0, LIMITS.description) : null
  }
  const firstText = (selectors, max) => {
    for (const selector of selectors) {
      try {
        const value = clean(document.querySelector(selector)?.textContent, max)
        if (value) return value
      } catch {
        // Ignore portal selector changes and continue through safe fallbacks.
      }
    }
    return null
  }
  const meta = (keys, max) => {
    for (const key of keys) {
      const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key
      const node =
        document.querySelector(`meta[property="${escaped}"]`) ||
        document.querySelector(`meta[name="${escaped}"]`)
      const value = clean(node?.getAttribute("content"), max)
      if (value) return value
    }
    return null
  }
  const scalar = (value, max) => {
    if (Array.isArray(value)) {
      return clean(value.map((item) => scalar(item, max)).filter(Boolean).join(", "), max)
    }
    if (value && typeof value === "object") {
      return scalar(value.name || value.value || value.description, max)
    }
    const text = clean(value, max)
    return text ? clean(cleanDescription(text), max) : null
  }
  const addressText = (value) => {
    const locations = Array.isArray(value) ? value : value ? [value] : []
    const parts = []
    for (const location of locations) {
      const address = location?.address || location
      if (typeof address === "string") parts.push(address)
      else if (address && typeof address === "object") {
        parts.push(
          [address.addressLocality, address.addressRegion, address.addressCountry]
            .map((part) => scalar(part, 100))
            .filter(Boolean)
            .join(", "),
        )
      }
    }
    return clean(parts.filter(Boolean).join("; "), LIMITS.location)
  }
  const salaryText = (value) => {
    if (!value) return null
    if (typeof value === "string" || typeof value === "number") {
      return clean(value, LIMITS.salary)
    }
    const currency = scalar(value.currency, 20)
    const amount = value.value && typeof value.value === "object" ? value.value : value
    const min = scalar(amount.minValue, 50)
    const max = scalar(amount.maxValue, 50)
    const exact = scalar(amount.value, 50)
    const unit = scalar(amount.unitText, 50)
    const range = min && max ? `${min} - ${max}` : exact || min || max
    return clean([currency, range, unit].filter(Boolean).join(" "), LIMITS.salary)
  }
  const collectSkills = (value) => {
    const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;|\n]/) : []
    return [...new Set(raw.map((item) => scalar(item, LIMITS.short)).filter(Boolean))].slice(
      0,
      LIMITS.skills,
    )
  }
  const validDate = (value) => {
    const text = scalar(value, 100)
    if (!text) return null
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  const safeHttpUrl = (value) => {
    const text = scalar(value, LIMITS.url)
    if (!text) return null
    try {
      const url = new URL(text, location.origin)
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
    } catch {
      return null
    }
  }
  const findJobPosting = (value, seen = new Set(), depth = 0) => {
    if (
      !value ||
      typeof value !== "object" ||
      seen.has(value) ||
      depth > 50 ||
      seen.size > 10000
    ) {
      return null
    }
    seen.add(value)
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findJobPosting(item, seen, depth + 1)
        if (found) return found
      }
      return null
    }
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]]
    if (types.some((type) => String(type).toLowerCase() === "jobposting")) return value
    for (const child of Object.values(value)) {
      const found = findJobPosting(child, seen, depth + 1)
      if (found) return found
    }
    return null
  }
  const labelValue = (labels, max) => {
    const wanted = labels.map((label) => label.toLowerCase())
    for (const node of document.querySelectorAll("dt, h2, h3, h4, strong, span, div")) {
      const label = clean(node.textContent, 100)?.toLowerCase()
      if (!label || !wanted.some((item) => label === item || label.startsWith(`${item}:`))) continue
      const sibling = node.nextElementSibling
      const value = clean(sibling?.textContent, max)
      if (value) return value
      if (label.includes(":")) {
        const inline = clean(label.slice(label.indexOf(":") + 1), max)
        if (inline) return inline
      }
    }
    return null
  }

  let currentUrl
  try {
    currentUrl = new URL(location.href)
  } catch {
    throw new Error("URL halaman tidak valid.")
  }
  currentUrl.hash = ""
  for (const key of [...currentUrl.searchParams.keys()]) {
    if (/^(?:utm_|ref$|referrer$|tracking|trackingid|source$)/i.test(key)) {
      currentUrl.searchParams.delete(key)
    }
  }
  if (currentUrl.href.length > LIMITS.url) currentUrl.search = ""
  if (currentUrl.href.length > LIMITS.url) {
    throw new Error("URL lowongan melebihi batas yang didukung.")
  }
  const host = currentUrl.hostname.toLowerCase()
  const path = currentUrl.pathname.toLowerCase()
  const glints = host === "glints.com" || host.endsWith(".glints.com")
  const jobstreet = ["jobstreet.co.id", "jobstreet.com"].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  )
  const isDetail =
    (glints && /\/(?:opportunities\/jobs|job)\//.test(path)) ||
    (jobstreet && (/\/job\//.test(path) || /\/joblisting\//.test(path)))
  if (currentUrl.protocol !== "https:" || !isDetail) {
    throw new Error("Halaman ini bukan detail lowongan yang didukung.")
  }

  let posting = null
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const json = script.textContent || ""
      if (json.length > 1000000) continue
      posting = findJobPosting(JSON.parse(json))
      if (posting) break
    } catch {
      // Invalid JSON-LD is untrusted page data; DOM fallbacks remain available.
    }
  }

  const organization = posting?.hiringOrganization
  const companyDetails = {}
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
    }
    for (const [key, value] of Object.entries(knownDetails)) {
      if (value) companyDetails[key] = value
    }
    const website = safeHttpUrl(organization.url)
    if (website) companyDetails.website = website
    const links = Array.isArray(organization.sameAs) ? organization.sameAs : [organization.sameAs]
    for (const value of links) {
      const link = safeHttpUrl(value)
      if (!link) continue
      if (/linkedin\.com/i.test(link)) companyDetails.linkedin = link
      else if (/instagram\.com/i.test(link)) companyDetails.instagram = link
      else if (/(?:twitter|x)\.com/i.test(link)) companyDetails.twitter = link
      else if (/facebook\.com/i.test(link)) companyDetails.facebook = link
    }
  }

  const source = glints ? "GLINTS" : "JOBSTREET"
  const title =
    scalar(posting?.title, LIMITS.title) ||
    firstText(
      ['[data-automation="job-detail-title"]', "h1"],
      LIMITS.title,
    ) ||
    meta(["og:title", "twitter:title"], LIMITS.title)
  if (!title) throw new Error("Judul lowongan tidak ditemukan pada halaman ini.")

  const description =
    cleanDescription(posting?.description) ||
    cleanDescription(
      firstText(
        [
          '[data-automation="jobAdDetails"]',
          '[data-testid="job-description"]',
          '[class*="JobDescription"]',
          "main article",
        ],
        LIMITS.description,
      ),
    ) ||
    cleanDescription(meta(["description", "og:description"], LIMITS.description))
  const company =
    scalar(organization, LIMITS.company) ||
    firstText(
      [
        '[data-automation="advertiser-name"]',
        '[data-automation="job-detail-company"]',
        'a[href*="/companies/"]',
      ],
      LIMITS.company,
    ) ||
    ""
  const locationText =
    addressText(posting?.jobLocation) ||
    firstText(
      ['[data-automation="job-detail-location"]', '[data-testid="job-location"]'],
      LIMITS.location,
    ) ||
    labelValue(["lokasi", "location"], LIMITS.location)
  const salary =
    salaryText(posting?.baseSalary) ||
    firstText(
      ['[data-automation="job-detail-salary"]', '[data-testid="job-salary"]'],
      LIMITS.salary,
    ) ||
    labelValue(["gaji", "salary"], LIMITS.salary)
  const externalMatch = glints
    ? currentUrl.pathname.match(/\/opportunities\/jobs\/([^/]+)/i) ||
      currentUrl.pathname.match(/\/job\/([^/]+)/i)
    : currentUrl.pathname.match(/\/(?:job|joblisting)\/([^/]+)/i)

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
      validDate(document.querySelector("time[datetime]")?.getAttribute("datetime")),
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
    externalJobId: scalar(posting?.identifier || externalMatch?.[1], LIMITS.short),
    companyDetails: Object.keys(companyDetails).length ? companyDetails : null,
  }
}

function renderPreview(job) {
  elements.preview.hidden = false
  elements.previewSource.textContent = job.source === "GLINTS" ? "Glints" : "Jobstreet"
  elements.previewTitle.textContent = job.title
  elements.previewCompany.textContent = job.company || "Perusahaan tidak tercantum"
  elements.locationRow.hidden = !job.location
  elements.previewLocation.textContent = job.location || ""
  elements.salaryRow.hidden = !job.salary
  elements.previewSalary.textContent = job.salary || ""
  elements.previewDescription.textContent =
    job.description || "Deskripsi tidak tersedia pada DOM halaman."
  elements.previewExtra.replaceChildren()
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
  ]
  for (const [label, value] of details) {
    if (!value) continue
    const row = document.createElement("div")
    const term = document.createElement("dt")
    const description = document.createElement("dd")
    term.textContent = label
    description.textContent = value
    row.append(term, description)
    elements.previewExtra.append(row)
  }
  elements.save.disabled = !accessToken || saving
}

async function scrapeActiveTab() {
  if (!activeTabId) return
  setStatus("Mengambil detail lowongan dari halaman...")
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: scrapeJobFromPage,
    })
    const result = results?.[0]
    if (!result || result.error || !result.result) {
      throw new Error("Detail lowongan tidak dapat dibaca dari halaman.")
    }
    parsedJob = result.result
    renderPreview(parsedJob)
    setStatus("Tinjau preview, lalu simpan jika datanya sudah sesuai.")
  } catch (error) {
    parsedJob = null
    elements.save.disabled = true
    setStatus(error instanceof Error ? error.message : "Scrape halaman gagal.", "error")
  }
}

async function saveJob() {
  if (!parsedJob || !accessToken || saving) return
  saving = true
  setBusy(elements.save, true, "Menyimpan...", "Simpan ke Job Hunter")
  setStatus("Menyimpan lowongan ke akun Anda...")
  try {
    const response = await fetch(`${baseUrl}/api/extension/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedJob),
    })
    if (response.status === 401) {
      await clearToken("Sesi koneksi berakhir. Hubungkan akun kembali.")
      return
    }
    if (!response.ok) {
      throw new Error(
        response.status === 400 || response.status === 422
          ? "Data preview tidak dapat disimpan. Muat ulang halaman dan coba lagi."
          : "Job Hunter belum dapat menyimpan lowongan.",
      )
    }
    const payload = await response.json()
    if (!payload?.job) throw new Error("Respons penyimpanan tidak valid.")
    setStatus("Lowongan berhasil disimpan ke Job Hunter.", "success")
    elements.save.textContent = "Tersimpan"
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Penyimpanan gagal.", "error")
  } finally {
    saving = false
    if (elements.save.textContent !== "Tersimpan") {
      setBusy(elements.save, false, "Menyimpan...", "Simpan ke Job Hunter")
      elements.save.disabled = !accessToken || !parsedJob
    } else {
      elements.save.disabled = true
      elements.save.setAttribute("aria-busy", "false")
    }
  }
}

async function initialize() {
  const [local, tabs] = await Promise.all([
    chrome.storage.local.get([
      TOKEN_KEY,
      TOKEN_ORIGIN_KEY,
      TOKEN_EXPIRES_AT_KEY,
    ]),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ])

  accessToken = typeof local[TOKEN_KEY] === "string" ? local[TOKEN_KEY] : null
  tokenOrigin = typeof local[TOKEN_ORIGIN_KEY] === "string" ? local[TOKEN_ORIGIN_KEY] : null
  tokenExpiresAt =
    typeof local[TOKEN_EXPIRES_AT_KEY] === "string" ? local[TOKEN_EXPIRES_AT_KEY] : null
  if (tokenExpiresAt && new Date(tokenExpiresAt) <= new Date()) await clearToken()
  if (accessToken && tokenOrigin !== baseUrl) await clearToken()

  const activeTab = tabs[0]
  const source = getJobSource(activeTab?.url)
  if (!source || !activeTab?.id) {
    elements.pageState.dataset.kind = "error"
    elements.pageHeading.textContent = "Bukan detail lowongan"
    elements.pageMessage.textContent =
      "Buka halaman detail lowongan Glints atau Jobstreet, lalu klik ekstensi lagi."
    elements.save.disabled = true
  } else {
    activeTabId = activeTab.id
    elements.pageHeading.textContent = "Detail lowongan terdeteksi"
    elements.pageMessage.textContent = `${source === "GLINTS" ? "Glints" : "Jobstreet"} siap dipreview dari tab aktif.`
    await scrapeActiveTab()
  }

  if (accessToken) await requestCurrentUser()
  else updateAuthUi()
}

elements.connect.addEventListener("click", connectAccount)
elements.disconnect.addEventListener("click", async () => {
  await clearToken()
  setStatus("Koneksi lokal diputus. Token server dapat dicabut dari dashboard.")
})
elements.save.addEventListener("click", saveJob)

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[TOKEN_KEY]) return
  const nextToken = changes[TOKEN_KEY].newValue
  accessToken = typeof nextToken === "string" ? nextToken : null
  updateAuthUi()
  if (accessToken) void requestCurrentUser()
})

initialize().catch(() => {
  elements.pageState.dataset.kind = "error"
  elements.pageHeading.textContent = "Ekstensi tidak siap"
  elements.pageMessage.textContent = "Tab aktif atau koneksi Job Hunter tidak dapat dibaca."
  elements.save.disabled = true
  updateAuthUi()
})
