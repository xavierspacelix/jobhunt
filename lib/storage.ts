import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "minio";

const LOCAL_DIR = path.join(process.cwd(), "uploads", "cvs");

function isMinioConfigured(): boolean {
  return Boolean(
    process.env.MINIO_ENDPOINT &&
      process.env.MINIO_ACCESS_KEY &&
      process.env.MINIO_SECRET_KEY,
  );
}

let minioClient: Client | null = null;

function getClient(): Client {
  if (!minioClient) {
    const endpoint = process.env.MINIO_ENDPOINT!
    let endPoint = endpoint
    let port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 443
    let useSSL = (process.env.MINIO_USE_SSL ?? "true") === "true"
    if (endpoint.includes("://")) {
      // Allow a full URL like http://minio:9000 so the scheme drives TLS.
      const u = new URL(endpoint)
      endPoint = u.hostname
      if (u.port) port = Number(u.port)
      useSSL = u.protocol === "https:"
      if (process.env.MINIO_PORT) port = Number(process.env.MINIO_PORT)
      if (process.env.MINIO_USE_SSL) useSSL = process.env.MINIO_USE_SSL === "true"
    } else if (!process.env.MINIO_USE_SSL) {
      // No explicit flag: derive TLS from the port (9000/80 = plaintext).
      useSSL = port === 443 || port === 9443
    }
    minioClient = new Client({
      endPoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    })
  }
  return minioClient
}

const BUCKET = process.env.MINIO_BUCKET ?? "jobhunter";

export async function saveCv(userId: string, buffer: Buffer): Promise<string> {
  const key = `cvs/${userId}.pdf`;

  if (isMinioConfigured()) {
    const client = getClient();
    const exists = await client.bucketExists(BUCKET);
    if (!exists) {
      await client.makeBucket(BUCKET);
    }
    await client.putObject(BUCKET, key, buffer, buffer.length, {
      "content-type": "application/pdf",
    });
    return key;
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, `${userId}.pdf`), buffer);
  return path.join("uploads", "cvs", `${userId}.pdf`);
}

export async function getCvUrl(key: string): Promise<string | null> {
  if (isMinioConfigured()) {
    const client = getClient();
    return client.presignedGetObject(BUCKET, key, 60 * 60);
  }
  if (key.startsWith(path.join("uploads", "cvs"))) {
    return `/api/cv?key=${encodeURIComponent(key)}`;
  }
  return null;
}

export async function readLocalCv(key: string): Promise<Buffer | null> {
  if (!key.startsWith(path.join("uploads", "cvs"))) return null;
  try {
    return await fs.readFile(path.join(process.cwd(), key));
  } catch {
    return null;
  }
}
