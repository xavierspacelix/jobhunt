import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.join(root, "browser-extension")
const output = path.join(root, ".artifacts", "job-hunter-extension-dev")

await mkdir(output, { recursive: true })
await cp(source, output, { recursive: true, force: true })

await writeFile(
  path.join(output, "config.js"),
  'globalThis.JOB_HUNTER_BASE_URL = "http://localhost:3000"\n',
  "utf8",
)

const manifestPath = path.join(output, "manifest.json")
const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
manifest.name = "Job Hunter (Local)"
manifest.version_name = `${manifest.version}-local`
manifest.host_permissions = [
  "http://localhost:3000/*",
  "https://glints.com/*",
  "https://*.glints.com/*",
  "https://id.jobstreet.com/*",
  "https://*.jobstreet.co.id/*",
  "https://jobstreet.com/*",
  "https://*.jobstreet.com/*",
]
manifest.externally_connectable.matches = [
  "http://localhost:3000/*",
  "https://jobhunt.spacelix.qzz.io/*",
]
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

console.log(`Development extension created at ${output}`)
