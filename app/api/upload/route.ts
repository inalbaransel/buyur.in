import { NextRequest, NextResponse } from "next/server";
import { createServerPB } from "@/lib/pocketbase";
import { buildObjectPath, uploadImage, type UploadKind } from "@/lib/minio";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_KINDS: UploadKind[] = ["logo", "cover", "product", "popup", "category"];

function isUploadKind(value: string): value is UploadKind {
  return (ALLOWED_KINDS as string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const pb = createServerPB();
  pb.authStore.save(authHeader, null);
  try {
    await pb.collection("buyur_users").authRefresh();
  } catch {
    return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });
  }
  const userId = pb.authStore.record?.id;

  const form = await req.formData();
  const file = form.get("file");
  const businessId = form.get("businessId");
  const kind = form.get("kind");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }
  if (typeof businessId !== "string" || typeof kind !== "string" || !isUploadKind(kind)) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Sadece görsel dosyaları yüklenebilir (jpg, png, webp, gif, avif)." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Dosya en fazla 5MB olabilir." }, { status: 400 });
  }

  let businessSlug: string;
  try {
    const business = await pb.collection("buyur_businesses").getOne(businessId);
    if (business.owner !== userId) {
      return NextResponse.json({ error: "Bu işletmeye erişiminiz yok." }, { status: 403 });
    }
    businessSlug = business.slug;
  } catch {
    return NextResponse.json({ error: "İşletme bulunamadı." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectPath = buildObjectPath(businessSlug, kind, file.type);
  const url = await uploadImage(buffer, file.type, objectPath);

  return NextResponse.json({ url });
}
