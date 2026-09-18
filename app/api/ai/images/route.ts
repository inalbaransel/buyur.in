// Ürün adına göre açık lisanslı görsel arama.
//
// Bu uç yalnızca ADAY döndürür; ürüne yazma kararı paneldedir.
//
// `best` OTOMATİK akış içindir ve yalnızca künye gerektirmeyen lisanslardan
// seçilir. `images` hepsini döndürür: kullanıcı atıf gerektiren bir görseli
// bilerek seçebilir, menüde künyesi otomatik gösterilir.
//
// Akışı asla bloklamaz: sonuç bulunamazsa boş liste ve `best: null` döner,
// panel ürünü görselsiz oluşturmaya devam eder.

import { NextRequest, NextResponse } from "next/server";
import { guardAiRequest, isGuardFailure } from "@/lib/ai/guard";
import { buildImageQuery, configuredProviders, pickAutoImage, searchProductImages } from "@/lib/ai/images";

const MAX_QUERY_LENGTH = 150;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const guard = await guardAiRequest(req.headers.get("authorization"), body.businessId, "ai_menu_import");
  if (isGuardFailure(guard)) return guard.response;

  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_QUERY_LENGTH) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, MAX_QUERY_LENGTH) : "";

  if (name === "" && category === "") {
    return NextResponse.json({ error: "Arama için ürün adı gerekli." }, { status: 400 });
  }

  try {
    const images = await searchProductImages(name, category);
    return NextResponse.json({
      images,
      best: pickAutoImage(images, buildImageQuery(name, category)),
      configured: configuredProviders().length > 0,
    });
  } catch (error) {
    console.error("Görsel arama hatası:", error);
    return NextResponse.json({ images: [], best: null, configured: true });
  }
}
