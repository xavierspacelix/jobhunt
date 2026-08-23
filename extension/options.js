const appUrl = document.getElementById("appUrl")
const status = document.getElementById("status")

chrome.storage.local.get(["appUrl"], (v) => {
  appUrl.value = v.appUrl || ""
})

document.getElementById("save").onclick = async () => {
  await chrome.storage.local.set({ appUrl: appUrl.value.trim() })
  status.textContent = "Tersimpan."
}
