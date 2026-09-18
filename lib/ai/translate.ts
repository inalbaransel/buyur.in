// AI ile çoklu dil içerik üretiminin SÖZLEŞMESİ.
//
// Çeviri YALNIZCA metin alanlarına dokunur. Fiyat, sayı, para birimi, alerjen
// kodu ve doğrulanması gereken hiçbir veri bu yoldan geçmez — modele zaten
// gönderilmez, dolayısıyla değiştiremez. Model çıktısı da buradaki birleştirme
// katmanından geçmeden kayda yazılmaz: istenmeyen dil, tanınmayan alan ve boş
// çeviri elenir.

import { SUPPORTED_LOCALES, type Locale, type TranslatableField, type Translations } from "@/lib/i18n";

/** Modele gönderilen tek bir çevrilebilir varlık. Yalnızca metin taşır. */
export interface TranslationEntry {
  /** Varlığı geri eşleştirmek için anahtar (kategori/ürün/seçenek kimliği). */
  id: string;
  /** Kullanıcıya bağlamı anlatan tür etiketi — çeviri kalitesini artırır. */
  kind: "category" | "product" | "option" | "popup";
  /** Ana dildeki metinler. Boş alanlar gönderilmez. */
  fields: Partial<Record<TranslatableField, string>>;
}

/** Çevrilebilir alanların tamamı; bunun dışındaki hiçbir anahtar kabul edilmez. */
const TRANSLATABLE_FIELDS: TranslatableField[] = [
  "name",
  "description",
  "campaign_label",
  "group_name",
  "title",
  "message",
];

export const MAX_ENTRIES_PER_REQUEST = 120;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** İstenen hedef dilleri süzer: desteklenmeyenler ve ana dil elenir.
 *  Ana dil hedefe girerse model ana metni "çevirip" bozabilir. */
export function resolveTargetLocales(requested: unknown, mainLocale: Locale, activeLocales: Locale[]): Locale[] {
  const active = new Set(activeLocales.filter(isLocale));
  const candidates = Array.isArray(requested) ? requested.filter(isLocale) : [...active];
  return [...new Set(candidates)].filter((locale) => locale !== mainLocale && active.has(locale));
}

/** Gönderilecek girdiyi temizler: boş metinler ve tanınmayan alanlar atılır,
 *  hiç metni kalmayan varlık listeye girmez. */
export function sanitizeEntries(entries: unknown): TranslationEntry[] {
  if (!Array.isArray(entries)) return [];
  const result: TranslationEntry[] = [];

  for (const raw of entries.slice(0, MAX_ENTRIES_PER_REQUEST)) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;

    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (id === "") continue;

    const kind =
      entry.kind === "category" || entry.kind === "product" || entry.kind === "option" || entry.kind === "popup"
        ? entry.kind
        : "product";

    const source = (entry.fields ?? {}) as Record<string, unknown>;
    const fields: Partial<Record<TranslatableField, string>> = {};
    for (const field of TRANSLATABLE_FIELDS) {
      const value = source[field];
      if (typeof value === "string" && value.trim() !== "") {
        fields[field] = value.trim();
      }
    }

    if (Object.keys(fields).length === 0) continue;
    result.push({ id, kind, fields });
  }

  return result;
}

/** Model çıktısını `id → Translations` haritasına indirger.
 *  İstenmeyen dil, tanınmayan alan, boş ya da metin olmayan değer elenir. */
export function normalizeTranslationResult(
  raw: unknown,
  targetLocales: Locale[],
  allowedIds: Set<string>
): Map<string, Translations> {
  const allowedLocales = new Set(targetLocales);
  const output = new Map<string, Translations>();

  const items = (raw as { items?: unknown })?.items;
  if (!Array.isArray(items)) return output;

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;

    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (id === "" || !allowedIds.has(id)) continue;

    const incoming = item.translations;
    if (!incoming || typeof incoming !== "object") continue;

    const translations: Translations = {};
    for (const [localeKey, value] of Object.entries(incoming as Record<string, unknown>)) {
      if (!isLocale(localeKey) || !allowedLocales.has(localeKey)) continue;
      if (!value || typeof value !== "object") continue;

      const fields: Partial<Record<TranslatableField, string>> = {};
      for (const field of TRANSLATABLE_FIELDS) {
        const text = (value as Record<string, unknown>)[field];
        if (typeof text === "string" && text.trim() !== "") {
          fields[field] = text.trim();
        }
      }
      if (Object.keys(fields).length > 0) translations[localeKey] = fields;
    }

    if (Object.keys(translations).length > 0) output.set(id, translations);
  }

  return output;
}

/** Yeni çevirileri mevcutların ÜZERİNE ekler, diğer dilleri korur.
 *  Kullanıcının elle girdiği bir çeviri yalnızca o dil yeniden üretildiyse
 *  değişir; başka bir dilin üretimi onu silmez. */
export function mergeTranslations(existing: Translations | undefined, incoming: Translations): Translations {
  const merged: Translations = { ...(existing ?? {}) };
  for (const [locale, fields] of Object.entries(incoming)) {
    if (!isLocale(locale)) continue;
    merged[locale] = { ...(merged[locale] ?? {}), ...fields };
  }
  return merged;
}

/** Modele verilen görev tanımı. Sayısal veriye dokunmama talimatı buranın
 *  en kritik cümlesidir. */
export function buildTranslationPrompt(targetLocales: Locale[], localeNames: Record<Locale, string>): string {
  const targets = targetLocales.map((locale) => `"${locale}" (${localeNames[locale]})`).join(", ");
  return `Sen bir restoran menüsü çevirmenisin. Sana verilen menü içeriklerini şu dillere çevireceksin: ${targets}.

KURALLAR:
1. YALNIZCA metin çevir. Sayı, fiyat, para birimi, ölçü ve kalori değerlerine dokunma — zaten sana gönderilmiyor.
2. Yemek adlarında yerel mutfak terimlerini koru. "Adana Kebap" gibi özel adlar çevrilmez, gerekiyorsa parantez içinde kısa açıklama eklenebilir.
3. Marka adlarını, özel isimleri ve ölçü birimlerini olduğu gibi bırak.
4. Menü diline uygun, kısa ve iştah açıcı yaz. Birebir sözlük çevirisi yapma.
5. Bir metni çeviremiyorsan o alanı sonuçtan tamamen çıkar — uydurma.
6. Gönderilen her öğenin "id" değerini yanıtta AYNEN koru.

Yanıtı MUTLAKA şu JSON şemasında ver:
{
  "items": [
    { "id": "<gönderilen id>", "translations": { ${targetLocales.map((l) => `"${l}": { "name": "string", "description": "string" }`).join(", ")} } }
  ]
}`;
}
