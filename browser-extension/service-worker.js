importScripts("config.js")

const INSTALLATION_ID_KEY = "jobHunterInstallationId"
const TOKEN_KEY = "jobHunterAccessToken"
const TOKEN_ORIGIN_KEY = "jobHunterTokenOrigin"
const TOKEN_EXPIRES_AT_KEY = "jobHunterTokenExpiresAt"
const BASE_URL = globalThis.JOB_HUNTER_BASE_URL

function randomBase64Url(byteLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function createPkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  let binary = ""
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function getInstallationId() {
  const stored = await chrome.storage.local.get([INSTALLATION_ID_KEY])
  if (typeof stored[INSTALLATION_ID_KEY] === "string") return stored[INSTALLATION_ID_KEY]
  const installationId = randomBase64Url(32)
  await chrome.storage.local.set({ [INSTALLATION_ID_KEY]: installationId })
  return installationId
}

async function connectAccount() {
  const installationId = await getInstallationId()
  const state = randomBase64Url(24)
  const codeVerifier = randomBase64Url(48)
  const codeChallenge = await createPkceChallenge(codeVerifier)
  const redirectUri = chrome.identity.getRedirectURL("connected")
  const connectUrl = new URL("/extension/connect", BASE_URL)
  connectUrl.searchParams.set("redirect_uri", redirectUri)
  connectUrl.searchParams.set("state", state)
  connectUrl.searchParams.set("code_challenge", codeChallenge)
  connectUrl.searchParams.set("installation_id", installationId)

  const returnedUrl = await chrome.identity.launchWebAuthFlow({
    url: connectUrl.href,
    interactive: true,
  })
  if (!returnedUrl) throw new Error("Alur masuk dibatalkan.")

  const callback = new URL(returnedUrl)
  const expectedCallback = new URL(redirectUri)
  if (
    callback.origin !== expectedCallback.origin ||
    callback.pathname !== expectedCallback.pathname ||
    callback.searchParams.get("state") !== state
  ) {
    throw new Error("Validasi koneksi gagal. Silakan coba kembali.")
  }
  const code = callback.searchParams.get("code")
  if (!code) throw new Error("Kode koneksi tidak diterima.")

  const response = await fetch(`${BASE_URL}/api/extension/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grantType: "authorization_code",
      code,
      codeVerifier,
      redirectUri,
      installationId,
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || "Pertukaran kode koneksi gagal.")
  }
  if (!payload?.accessToken || !payload?.expiresAt) {
    throw new Error("Respons koneksi tidak valid.")
  }

  await chrome.storage.local.set({
    [TOKEN_KEY]: payload.accessToken,
    [TOKEN_ORIGIN_KEY]: BASE_URL,
    [TOKEN_EXPIRES_AT_KEY]: payload.expiresAt,
  })
  return {
    accessToken: payload.accessToken,
    tokenOrigin: BASE_URL,
    expiresAt: payload.expiresAt,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "JOBHUNTER_CONNECT") return false
  connectAccount()
    .then((connection) => sendResponse({ ok: true, connection }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Koneksi akun gagal.",
      }),
    )
  return true
})

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "JOBHUNTER_PING") return false

  getInstallationId()
    .then((installationId) => {
      sendResponse({
        installed: true,
        installationId,
        version: chrome.runtime.getManifest().version,
      })
    })
    .catch(() => sendResponse({ installed: true, installationId: null }))

  return true
})
