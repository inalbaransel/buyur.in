// Fiziksel menü tarama: fotoğraf veya PDF → kategori/ürün/fiyat çıkarımı.
//
// Model çıktısı doğrudan döndürülmez; lib/ai/menu-scan.ts normalize katmanından
// geçer. Okunamayan alanlar tahmin edilmez, "uncertain" olarak işaretlenir ve
// kullanıcı önizlemede düzeltir. Kayda yazma bu uçta YAPILMAZ — içe aktarma
// kullanıcının onayından sonra panelde gerçekleşir.

import { NextRequest, NextResponse } from "next/server";
import { guardAiRequest, openaiClient, isGuardFailure, MENU_MODEL } from "@/lib/ai/guard";
import { normalizeScanResult, SCAN_SYSTEM_PROMPT } from "@/lib/ai/menu-scan";
import { aiUsage, aiPeriodKey } from "@/lib/entitlements";

/** Tek bir sayfanın veri URI üst sınırı (~8MB base64 ≈ 6MB dosya). */
const MAX_PAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_PREFIX = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/;
const PDF_PREFIX = /^data:application\/pdf;base64,/;

type Page = { kind: "image"; data: string } | { kind: "pdf"; data: string };

/** Girdiyi doğrular: yalnızca beklenen veri URI biçimleri ve boyut sınırı. */
function parsePages(value: unknown, maxPages: number): { pages: Page[] } | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Görsel bulunamadı." };
  }
  if (value.length > maxPages) {
    return { error: `Tek seferde en fazla ${maxPages} sayfa menü tarayabilirsiniz.` };
  }

  const pages: Page[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return { error: "Geçersiz dosya biçimi." };
    if (entry.length > MAX_PAGE_BYTES) {
      return { error: "Dosyalardan biri çok büyük. Her sayfa en fazla 6 MB olmalı." };
    }
    if (IMAGE_PREFIX.test(entry)) {
      pages.push({ kind: "image", data: entry });
    } else if (PDF_PREFIX.test(entry)) {
      pages.push({ kind: "pdf", data: entry });
    } else {
      return { error: "Yalnızca görsel (jpg, png, webp) veya PDF yükleyebilirsiniz." };
    }
  }

  return { pages };
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const guard = await guardAiRequest(req.headers.get("authorization"), body.businessId, "ai_menu_import");
  if (isGuardFailure(guard)) return guard.response;
  const { business, pb } = guard;

  // Kota: plan başına aylık tarama hakkı (lib/entitlements.ts → aiUsage).
  const usage = aiUsage(business);
  if (usage.exhausted) {
    return NextResponse.json(
      { error: `Bu ay için yapay zekâ tarama hakkınız doldu (${usage.limit}/${usage.limit}). Gelecek ay yenilenir.` },
      { status: 429 }
    );
  }

  const parsed = parsePages(body.images, usage.pagesPerScan);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const openai = openaiClient();
  if (isGuardFailure(openai)) return openai.response;

  try {
    // Responses API görsel ve PDF'i aynı içerik dizisinde kabul eder; PDF'i
    // istemcide sayfa sayfa görsele çevirmeye gerek kalmıyor.
    const content: Record<string, unknown>[] = [{ type: "input_text", text: SCAN_SYSTEM_PROMPT }];
    parsed.pages.forEach((page, index) => {
      if (page.kind === "image") {
        content.push({ type: "input_image", image_url: page.data, detail: "high" });
      } else {
        content.push({ type: "input_file", filename: `menu-${index + 1}.pdf`, file_data: page.data });
      }
    });

    const response = await openai.responses.create({
      model: MENU_MODEL,
      input: [{ role: "user", content: content as never }],
      text: { format: { type: "json_object" } },
      max_output_tokens: 8000,
    });

    let raw: unknown;
    try {
      raw = JSON.parse(response.output_text || "{}");
    } catch {
      return NextResponse.json(
        { error: "Menü okunamadı. Daha net bir fotoğrafla tekrar deneyin." },
        { status: 502 }
      );
    }

    const result = normalizeScanResult(raw);

    if (result.categories.length === 0) {
      return NextResponse.json(
        { error: "Menüde okunabilir ürün bulunamadı. Daha net ve düz çekilmiş bir fotoğrafla tekrar deneyin." },
        { status: 422 }
      );
    }

    // Kota yalnızca gerçekten sonuç üreten tarama için harcanır.
    const period = aiPeriodKey();
    try {
      await pb.collection("buyur_businesses").update(business.id, {
        ai_scans_used: usage.used + 1,
        ai_scans_period: period,
      });
    } catch (error) {
      // Sayaç yazılamazsa kullanıcıyı sonucundan etmeyelim; yalnızca logla.
      console.error("Yapay zekâ kota sayacı güncellenemedi:", error);
    }

    return NextResponse.json({
      ...result,
      usage: {
        used: usage.used + 1,
        limit: usage.limit,
        remaining: usage.limit === null ? null : Math.max(0, usage.limit - usage.used - 1),
      },
    });
  } catch (error) {
    console.error("Yapay zekâ menü tarama hatası:", error);
    return NextResponse.json({ error: "Yapay zekâ tarama yaparken bir hata oluştu." }, { status: 500 });
  }
}
