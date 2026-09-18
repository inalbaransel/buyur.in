// AI ile çoklu dil içerik üretimi.
//
// Modele YALNIZCA metin gönderilir: fiyat, sayı, para birimi ve alerjen verisi
// bu uçtan geçmez, dolayısıyla model değiştiremez. Dönen çeviriler de
// lib/ai/translate.ts'teki süzgeçten geçer (istenmeyen dil, tanınmayan alan ve
// boş değer elenir) ve KAYDA YAZILMAZ — kullanıcı panelde onaylar.

import { NextRequest, NextResponse } from "next/server";
import { guardAiRequest, openaiClient, isGuardFailure, MENU_MODEL } from "@/lib/ai/guard";
import {
  sanitizeEntries,
  resolveTargetLocales,
  normalizeTranslationResult,
  buildTranslationPrompt,
} from "@/lib/ai/translate";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localeLabels, type Locale } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const guard = await guardAiRequest(req.headers.get("authorization"), body.businessId, "ai_translation");
  if (isGuardFailure(guard)) return guard.response;
  const { business } = guard;

  const mainLocale = (business.main_language ?? DEFAULT_LOCALE) as Locale;
  // Eski kayıtlarda dil alanları tanımsızdır; o durumda tüm diller aktif sayılır
  // (bkz. lib/i18n.ts ve Business.languages yorumu).
  const activeLocales =
    business.languages && business.languages.length > 0
      ? business.languages
      : business.main_language
        ? [mainLocale]
        : [...SUPPORTED_LOCALES];

  const targetLocales = resolveTargetLocales(body.locales, mainLocale, [...activeLocales, mainLocale]);
  if (targetLocales.length === 0) {
    return NextResponse.json(
      { error: "Çeviri için ana dil dışında en az bir aktif dil seçmelisiniz." },
      { status: 400 }
    );
  }

  const entries = sanitizeEntries(body.entries);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Çevrilecek içerik bulunamadı." }, { status: 400 });
  }

  const openai = openaiClient();
  if (isGuardFailure(openai)) return openai.response;

  try {
    const response = await openai.responses.create({
      model: MENU_MODEL,
      input: [
        { role: "system", content: buildTranslationPrompt(targetLocales, localeLabels) },
        {
          role: "user",
          content: JSON.stringify({
            sourceLocale: mainLocale,
            items: entries.map((entry) => ({ id: entry.id, kind: entry.kind, fields: entry.fields })),
          }),
        },
      ],
      text: { format: { type: "json_object" } },
      max_output_tokens: 8000,
    });

    let raw: unknown;
    try {
      raw = JSON.parse(response.output_text || "{}");
    } catch {
      return NextResponse.json({ error: "Çeviri sonucu okunamadı. Tekrar deneyin." }, { status: 502 });
    }

    const allowedIds = new Set(entries.map((entry) => entry.id));
    const normalized = normalizeTranslationResult(raw, targetLocales, allowedIds);

    if (normalized.size === 0) {
      return NextResponse.json({ error: "Çeviri üretilemedi. Tekrar deneyin." }, { status: 422 });
    }

    return NextResponse.json({
      locales: targetLocales,
      items: [...normalized.entries()].map(([id, translations]) => ({ id, translations })),
    });
  } catch (error) {
    console.error("Yapay zekâ çeviri hatası:", error);
    return NextResponse.json({ error: "Yapay zekâ çeviri yaparken bir hata oluştu." }, { status: 500 });
  }
}
