const statusEl = document.getElementById("status")
const captureBtn = document.getElementById("capture")
const optionsLink = document.getElementById("options")

optionsLink.onclick = () => chrome.runtime.openOptionsPage()

function setStatus(text, ok) {
  statusEl.textContent = text
  statusEl.style.color =
    ok === false ? "#b00020" : ok === true ? "#047857" : "#333"
}

captureBtn.onclick = async () => {
  const { appUrl } = await chrome.storage.local.get(["appUrl"])
  if (!appUrl) {
    setStatus("Buka Pengaturan dulu (klik tautan di bawah): isi App URL.", false)
    return
  }
  const base = appUrl.replace(/\/+$/, "")

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    setStatus("Tidak ada tab aktif.", false)
    return
  }

  let html
  let url
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        html: document.documentElement.outerHTML,
        url: location.href,
      }),
    })
    html = res[0]?.result?.html
    url = res[0]?.result?.url
  } catch (e) {
    setStatus("Gagal baca halaman: " + (e?.message || e), false)
    return
  }

  if (!html || !url) {
    setStatus("Halaman kosong atau URL tidak ditemukan.", false)
    return
  }

  setStatus("Mengirim…")
  try {
    const r = await fetch(base + "/api/scrape/ingest", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, html }),
    })
    const data = await r.json().catch(() => ({}))

    if (r.status === 401 || data?.loginRequired) {
      chrome.tabs.create({ url: base + "/login" })
      setStatus(
        "Belum login ke JobHunter. Halaman login dibuka — silakan login, lalu coba lagi.",
        false,
      )
      return
    }
    if (!r.ok) {
      setStatus("Error: " + (data.error || r.status), false)
      return
    }
    setStatus(
      `OK — ${data.saved} disimpan, ${data.skipped} dilewati.` +
        (data.results?.[0]?.title ? "\n" + data.results[0].title : ""),
      true,
    )
  } catch (e) {
    setStatus("Gagal kirim: " + (e?.message || e), false)
  }
}
