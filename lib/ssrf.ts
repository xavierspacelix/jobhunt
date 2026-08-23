import dns from "node:dns/promises";
import net from "node:net";
import type { LookupAddress } from "node:dns";

const SCRAPER_HOSTS = ["glints.com", "jobstreet.co.id", "jobstreet.com"];

export type PublicAddress = {
  address: string;
  family: 4 | 6;
};

export type PinnedUrl = PublicAddress & {
  url: URL;
};

export type DnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<LookupAddress[]>;

function ipv4Bytes(ip: string): number[] | null {
  if (net.isIP(ip) !== 4) return null;
  return ip.split(".").map(Number);
}

function ipv6Bytes(ip: string): number[] | null {
  if (net.isIP(ip) !== 6) return null;

  let value = ip.toLowerCase();
  const ipv4Index = value.lastIndexOf(":");
  const ipv4 = value.slice(ipv4Index + 1);
  if (ipv4.includes(".")) {
    const bytes = ipv4Bytes(ipv4);
    if (!bytes) return null;
    value = `${value.slice(0, ipv4Index)}:${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }

  const halves = value.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const groups =
    halves.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
      : left;
  if (groups.length !== 8) return null;

  return groups.flatMap((group) => {
    const number = Number.parseInt(group, 16);
    return [number >> 8, number & 0xff];
  });
}

function inCidr(bytes: number[], prefix: number[], bits: number): boolean {
  const fullBytes = Math.floor(bits / 8);
  const remainingBits = bits % 8;
  for (let i = 0; i < fullBytes; i += 1) {
    if (bytes[i] !== prefix[i]) return false;
  }
  if (remainingBits === 0) return true;
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (bytes[fullBytes] & mask) === (prefix[fullBytes] & mask);
}

export function isPublicIpAddress(ip: string): boolean {
  const v4 = ipv4Bytes(ip);
  if (v4) {
    const blocked: Array<[number[], number]> = [
      [[0, 0, 0, 0], 8],
      [[10, 0, 0, 0], 8],
      [[100, 64, 0, 0], 10],
      [[127, 0, 0, 0], 8],
      [[169, 254, 0, 0], 16],
      [[172, 16, 0, 0], 12],
      [[192, 0, 0, 0], 24],
      [[192, 0, 2, 0], 24],
      [[192, 31, 196, 0], 24],
      [[192, 52, 193, 0], 24],
      [[192, 88, 99, 0], 24],
      [[192, 168, 0, 0], 16],
      [[192, 175, 48, 0], 24],
      [[198, 18, 0, 0], 15],
      [[198, 51, 100, 0], 24],
      [[203, 0, 113, 0], 24],
      [[224, 0, 0, 0], 4],
      [[240, 0, 0, 0], 4],
    ];
    return !blocked.some(([prefix, bits]) => inCidr(v4, prefix, bits));
  }

  const v6 = ipv6Bytes(ip);
  if (!v6) return false;
  const blocked: Array<[number[], number]> = [
    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 128],
    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 128],
    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 0, 0, 0, 0], 96],
    [[0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 96],
    [[0x00, 0x64, 0xff, 0x9b, 0, 0x01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 48],
    [[0x01, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 64],
    [[0x20, 0x01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 23],
    [[0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 32],
    [[0x20, 0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 16],
    [[0x3f, 0xfe, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 16],
    [[0x3f, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 20],
    [[0x5f, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 16],
    [[0xfc, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 7],
    [[0xfe, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 10],
    [[0xfe, 0xc0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 10],
    [[0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 8],
  ];
  return !blocked.some(([prefix, bits]) => inCidr(v6, prefix, bits));
}

export function isAllowedScraperHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return SCRAPER_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function scraperSourceForHostname(
  hostname: string,
): "GLINTS" | "JOBSTREET" | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "glints.com" || host.endsWith(".glints.com")) return "GLINTS";
  if (
    host === "jobstreet.co.id" ||
    host.endsWith(".jobstreet.co.id") ||
    host === "jobstreet.com" ||
    host.endsWith(".jobstreet.com")
  ) {
    return "JOBSTREET";
  }
  return null;
}

export function validateScraperUrl(value: string, base?: string): URL {
  const url = base ? new URL(value, base) : new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Protocol blocked");
  }
  if (url.username || url.password) throw new Error("Credentials blocked");
  if (!isAllowedScraperHostname(url.hostname)) throw new Error("Host blocked");
  if (url.port && url.port !== "443") {
    throw new Error("Port blocked");
  }
  if (net.isIP(url.hostname) && !isPublicIpAddress(url.hostname)) {
    throw new Error("Private address blocked");
  }
  return url;
}

export function validatePublicHttpUrl(value: string, base?: string): URL {
  const url = base ? new URL(value, base) : new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Protocol blocked");
  }
  if (url.username || url.password) throw new Error("Credentials blocked");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Port blocked");
  }
  if (net.isIP(url.hostname) && !isPublicIpAddress(url.hostname)) {
    throw new Error("Private address blocked");
  }
  return url;
}

export async function resolvePublicHostname(
  hostname: string,
  lookup: DnsLookup = dns.lookup,
): Promise<PublicAddress> {
  const host = hostname.toLowerCase().trim().replace(/\.$/, "");
  const family = net.isIP(host);
  if (family === 4 || family === 6) {
    if (!isPublicIpAddress(host)) throw new Error("Private address blocked");
    return { address: host, family };
  }

  let addresses: LookupAddress[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("DNS resolution failed");
  }
  if (addresses.length === 0) throw new Error("DNS resolution failed");
  if (addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error("Private address blocked");
  }
  const selected = addresses[0];
  if (selected.family !== 4 && selected.family !== 6) {
    throw new Error("DNS resolution failed");
  }
  return { address: selected.address, family: selected.family };
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  await resolvePublicHostname(hostname);
}

export async function resolveSafeScraperUrl(
  value: string,
  base?: string,
  lookup?: DnsLookup,
): Promise<PinnedUrl> {
  const url = validateScraperUrl(value, base);
  const address = await resolvePublicHostname(url.hostname, lookup);
  return { url, ...address };
}

export async function assertSafeScraperUrl(
  value: string,
  base?: string,
): Promise<URL> {
  return (await resolveSafeScraperUrl(value, base)).url;
}

export async function assertPublicHttpUrl(
  value: string,
  base?: string,
): Promise<URL> {
  const url = validatePublicHttpUrl(value, base);
  await assertPublicHostname(url.hostname);
  return url;
}
