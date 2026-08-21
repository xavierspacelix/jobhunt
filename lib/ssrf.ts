import dns from "node:dns/promises"
import net from "node:net"
import type { LookupAddress } from "node:dns"

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true
  }
  const [a, b] = parts
  if (a === 0) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 192 && b === 0 && parts[2] === 0) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === "::1" || lower === "::") return true
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true
  }
  if (lower.startsWith("::ffff:")) {
    return isPrivateIpv4(lower.slice("::ffff:".length))
  }
  return false
}

function isPrivate(ip: string): boolean {
  if (net.isIP(ip) === 4) return isPrivateIpv4(ip)
  if (net.isIP(ip) === 6) return isPrivateIpv6(ip)
  return true
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().trim()
  if (net.isIP(host)) {
    if (isPrivate(host)) throw new Error("Private address blocked")
    return
  }
  let addresses: LookupAddress[]
  try {
    addresses = await dns.lookup(host, { all: true })
  } catch {
    throw new Error("DNS resolution failed")
  }
  if (addresses.length === 0) throw new Error("DNS resolution failed")
  for (const { address } of addresses) {
    if (isPrivate(address)) throw new Error("Private address blocked")
  }
}
