"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import { useToast } from "@/components/panel/toast";
import { AiActionButton } from "@/components/panel/ui";
import { activeLocales, localeLabels, mainLocale } from "@/lib/i18n";
import type { Locale, TranslatableField, Translations } from "@/lib/i18n";
import { mergeTranslations } from "@/lib/ai/translate";
import { isFeatureAvailable } from "@/lib/entitlements";
import type { Business } from "@/lib/types";

// Form içi "diğer dilleri tamamla" butonu.
//
// Toplu çeviri ekranının yerini alır: kullanıcı ana dildeki metni yazar, tek
// tıkla YALNIZCA düzenlediği kaydın diğer dilleri üretilir. Böylece her
// basışta tüm menü yeniden çevrilmez.
//
// Üretilen çeviri doğrudan kaydedilmez: forma yazılır, kullanıcı görür,
// düzenleyebilir ve kaydet'e basınca yayına girer (bkz. CLAUDE.md §10).
export function AiTranslateButton({
  business,
  kind,
  fields,
  translations,
  onTranslationsChange,
  label = "Diğer dilleri tamamla",
}: {
  business: Business;
  /** Modele bağlam verir; çeviri kalitesini artırır. */
  kind: "category" | "product" | "option" | "popup";
  /** Ana dildeki metinler — boş olanlar gönderilmez. */
  fields: Partial<Record<TranslatableField, string>>;
  translations: Translations;
  onTranslationsChange: (next: Translations) => void;
  label?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const main = mainLocale(business);
  const targets: Locale[] = activeLocales(business).filter((locale) => locale !== main);

  // Tek dilli işletmede ya da özellik plana kapalıysa buton hiç görünmez.
  if (targets.length === 0 || !isFeatureAvailable(business, "ai_translation")) return null;

  const filled = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => typeof value === "string" && value.trim() !== "")
  ) as Partial<Record<TranslatableField, string>>;
  const hasText = Object.keys(filled).length > 0;

  async function handleClick() {
    if (!hasText) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: pb.authStore.token },
        body: JSON.stringify({
          businessId: business.id,
          locales: targets,
          entries: [{ id: "form", kind, fields: filled }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Çeviri üretilemedi.");

      const item = (data.items as { id: string; translations: Translations }[] | undefined)?.[0];
      if (!item) throw new Error("Çeviri üretilemedi. Tekrar deneyin.");

      // Elle girilmiş çeviriler korunur, üretilenler üzerine yazılır.
      onTranslationsChange(mergeTranslations(translations, item.translations));
      toast(
        `${targets.map((locale) => localeLabels[locale]).join(", ")} dolduruldu. Kontrol edip kaydedin.`
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Çeviri üretilemedi.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AiActionButton
      type="button"
      onClick={handleClick}
      loading={loading}
      disabled={!hasText}
      title={hasText ? undefined : "Önce ana dildeki metni yazın."}
    >
      {label}
    </AiActionButton>
  );
}
