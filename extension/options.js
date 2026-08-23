const appUrl = document.getElementById("appUrl")
const token = document.getElementById("token")
const status = document.getElementById("status")

chrome.storage.local.get(["appUrl", "token"], (v) => {
  appUrl.value = v.appUrl || ""
  token.value = v.token || ""
})

document.getElementById("save").onclick = async () => {
  await chrome.storage.local.set({
    appUrl: appUrl.value.trim(),
    token: token.value.trim(),
  })
  status.textContent = "Tersimpan."
}
