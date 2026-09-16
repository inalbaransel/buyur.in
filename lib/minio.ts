import { Client } from "minio";

// Ürün görselleri, logo ve kapak fotoğrafları burada saklanır.
// Pocketbase kayıtları sadece dönen public URL'i tutar.
const endpoint = new URL(process.env.MINIO_ENDPOINT ?? "https://s3.harbidigital.com");
const bucket = process.env.MINIO_BUCKET ?? "buyur";

export const minioClient = new Client({
  endPoint: endpoint.hostname,
  port: endpoint.port ? Number(endpoint.port) : undefined,
  useSSL: endpoint.protocol === "https:",
  accessKey: process.env.MINIO_ACCESS_KEY ?? "",
  secretKey: process.env.MINIO_SECRET_KEY ?? "",
});

export const MINIO_BUCKET = bucket;
export const MINIO_PUBLIC_URL = (process.env.MINIO_PUBLIC_URL ?? `${endpoint.origin}/${bucket}`).replace(/\/$/, "");

export type UploadKind = "logo" | "cover" | "product" | "popup" | "category";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// İşletme başına tek olan logo/kapak her zaman aynı isme yazılır (eskisinin
// üzerine yazar, dosya birikmez). Ürün/pop-up görselleri birden fazla
// olabildiği için okunaklılığı bozmayacak kısa bir zaman damgasıyla ayrılır.
export function buildObjectPath(businessSlug: string, kind: UploadKind, mimeType: string): string {
  const ext = EXT_BY_TYPE[mimeType] ?? "bin";
  if (kind === "logo" || kind === "cover") {
    return `${businessSlug}/${kind}/${kind}.${ext}`;
  }
  return `${businessSlug}/${kind}s/${Date.now()}.${ext}`;
}

export async function uploadImage(buffer: Buffer, mimeType: string, objectPath: string): Promise<string> {
  await minioClient.putObject(MINIO_BUCKET, objectPath, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
  return `${MINIO_PUBLIC_URL}/${objectPath}`;
}
