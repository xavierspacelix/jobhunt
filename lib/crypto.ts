import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[crypto] APP_ENCRYPTION_KEY is not set; user secrets are encrypted with an insecure fallback key. Set APP_ENCRYPTION_KEY to a 32-byte value (64-char hex).",
      );
    }
    return Buffer.alloc(32, 0);
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const buf = Buffer.from(raw, "utf8");
  if (buf.length >= 32) return buf.subarray(0, 32);
  return Buffer.concat([buf, Buffer.alloc(32 - buf.length, 0)]);
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith("v1:")) return stored;
  try {
    const [, ivHex, tagHex, encryptedHex] = stored.split(":");
    const key = getKey();
    const decipher = createDecipheriv(
      ALGO,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
