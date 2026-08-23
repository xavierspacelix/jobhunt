const PRODUCTION_URL = "https://jobhunt.spacelix.qzz.io"
const LOCAL_URL = "http://localhost:3000"
const SUPPORTED_HOSTS = ["glints.com", "jobstreet.co.id", "jobstreet.com"]

const baseUrlInput = document.querySelector("#base-url")
const detectLocalhostInput = document.querySelector("#detect-localhost")
const handoffButton = document.querySelector("#handoff")
const status = document.querySelector("#status")

let activeJobUrl = null

function setStatus(message, kind = "info") {
  status.textContent = message
  status.dataset.kind = kind
}

function normalizeBaseUrl(value) {
  const url = new URL(value)
  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1"
  if (url.username || url.password || (url.protocol !== "https:" && !(localHost && url.protocol === "http:"))) {
    throw new Error("Gunakan URL HTTPS, atau HTTP khusus localhost.")
  }
  return url.origin
}

function supportedJobUrl(value) {
  try {
    const url = new URL(value)
    const supported = SUPPORTED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
    return url.protocol === "https:" && supported ? url.href : null
  } catch {
    return null
  }
}

async function detectLocalhost() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 800)
  try {
    const response = await fetch(`${LOCAL_URL}/api/health`, {
      cache: "no-store",
      signal: controller.signal,
    })
    const body = await response.json()
    return response.ok && body.ok === true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function initialize() {
  const settings = await chrome.storage.sync.get({
    jobHunterBaseUrl: PRODUCTION_URL,
    detectLocalhost: true,
  })
  baseUrlInput.value = settings.jobHunterBaseUrl
  detectLocalhostInput.checked = settings.detectLocalhost

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  activeJobUrl = supportedJobUrl(tab?.url)
  if (!activeJobUrl) {
    handoffButton.disabled = true
    setStatus("Buka halaman lowongan Glints atau Jobstreet terlebih dahulu.", "error")
    return
  }

  setStatus("Halaman lowongan didukung dan siap dikirim.")
}

handoffButton.addEventListener("click", async () => {
  if (!activeJobUrl) return

  handoffButton.disabled = true
  setStatus("Menyiapkan handoff...")
  try {
    const configuredUrl = normalizeBaseUrl(baseUrlInput.value.trim())
    const detectLocalhostEnabled = detectLocalhostInput.checked
    await chrome.storage.sync.set({
      jobHunterBaseUrl: configuredUrl,
      detectLocalhost: detectLocalhostEnabled,
    })

    const baseUrl =
      detectLocalhostEnabled && (await detectLocalhost()) ? LOCAL_URL : configuredUrl
    const destination = new URL("/jobs", baseUrl)
    destination.searchParams.set("url", activeJobUrl)
    destination.searchParams.set("source", "extension")
    await chrome.tabs.create({ url: destination.href })
    window.close()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Handoff gagal dibuka.", "error")
    handoffButton.disabled = false
  }
})

initialize().catch(() => {
  handoffButton.disabled = true
  setStatus("Ekstensi gagal membaca tab aktif.", "error")
})
