import { describe, expect, it } from "vitest";
import {
  mergeTranslations,
  normalizeTranslationResult,
  resolveTargetLocales,
  sanitizeEntries,
} from "@/lib/ai/translate";

// AI çeviri sözleşmesi. Korunan en kritik kural: ÇEVİRİ YALNIZCA METNE DOKUNUR.
// Fiyat ve sayısal veri modele hiç gönderilmez (sanitizeEntries yalnızca
// çevrilebilir metin alanlarını geçirir) ve dönen çıktıdan da yalnızca bilinen
// metin alanları kabul edilir.

describe("sanitizeEntries", () => {
  it("yalnızca çevrilebilir metin alanlarını geçirir — fiyat ve sayı elenir", () => {
    const [entry] = sanitizeEntries([
      {
        id: "product:abc",
        kind: "product",
        fields: {
          name: "Adana Kebap",
          description: "Acılı",
          price: 320,
          calories: 850,
          allergens: ["gluten"],
        },
      },
    ]);

    expect(entry.fields).toEqual({ name: "Adana Kebap", description: "Acılı" });
    expect(entry.fields).not.toHaveProperty("price");
    expect(entry.fields).not.toHaveProperty("calories");
  });

  it("kimliksiz ya da metni olmayan kaydı listeye almaz", () => {
    expect(sanitizeEntries([{ id: "", fields: { name: "X" } }])).toHaveLength(0);
    expect(sanitizeEntries([{ id: "product:1", fields: { name: "   " } }])).toHaveLength(0);
    expect(sanitizeEntries([{ id: "product:1", fields: {} }])).toHaveLength(0);
  });

  it("bilinmeyen kind değerini ürün kabul eder", () => {
    const [entry] = sanitizeEntries([{ id: "x", kind: "uydurma", fields: { name: "Test" } }]);
    expect(entry.kind).toBe("product");
  });

  // Kampanya (popup) formu da form içi çeviri butonunu kullanır; kendi bağlam
  // etiketi olmazsa model kampanya metnini ürün adı sanıp kısaltıyordu.
  it("tanınan kind değerlerini olduğu gibi korur", () => {
    for (const kind of ["category", "product", "option", "popup"] as const) {
      const [entry] = sanitizeEntries([{ id: "x", kind, fields: { name: "Test" } }]);
      expect(entry.kind).toBe(kind);
    }
  });

  it("beklenmeyen girdide boş liste döner", () => {
    expect(sanitizeEntries(null)).toHaveLength(0);
    expect(sanitizeEntries("olmaz")).toHaveLength(0);
    expect(sanitizeEntries([null, 3])).toHaveLength(0);
  });
});

describe("resolveTargetLocales", () => {
  it("ana dili hedeften çıkarır — ana metin çevrilip bozulmasın", () => {
    expect(resolveTargetLocales(["tr", "en", "ar"], "tr", ["tr", "en", "ar"])).toEqual(["en", "ar"]);
  });

  it("aktif olmayan dili eler", () => {
    expect(resolveTargetLocales(["en", "ru"], "tr", ["tr", "en"])).toEqual(["en"]);
  });

  it("desteklenmeyen dil kodunu eler", () => {
    expect(resolveTargetLocales(["en", "de", "zz"], "tr", ["tr", "en"])).toEqual(["en"]);
  });

  it("dil seçilmediyse tüm aktif dilleri hedefler", () => {
    expect(resolveTargetLocales(undefined, "tr", ["tr", "en", "ru"])).toEqual(["en", "ru"]);
  });

  it("yinelenen dilleri tekilleştirir", () => {
    expect(resolveTargetLocales(["en", "en", "ar"], "tr", ["tr", "en", "ar"])).toEqual(["en", "ar"]);
  });
});

describe("normalizeTranslationResult", () => {
  const allowed = new Set(["product:1"]);

  it("istenmeyen dili kabul etmez", () => {
    const result = normalizeTranslationResult(
      { items: [{ id: "product:1", translations: { en: { name: "Lentil Soup" }, ru: { name: "Суп" } } }] },
      ["en"],
      allowed
    );
    expect(result.get("product:1")).toEqual({ en: { name: "Lentil Soup" } });
  });

  it("gönderilmemiş kimliği kabul etmez — model uydurursa yazılmaz", () => {
    const result = normalizeTranslationResult(
      { items: [{ id: "product:99", translations: { en: { name: "Hayalet" } } }] },
      ["en"],
      allowed
    );
    expect(result.size).toBe(0);
  });

  it("tanınmayan alanı ve boş çeviriyi eler", () => {
    const result = normalizeTranslationResult(
      {
        items: [
          {
            id: "product:1",
            translations: { en: { name: "Soup", price: 120, description: "   ", uydurma: "x" } },
          },
        ],
      },
      ["en"],
      allowed
    );
    expect(result.get("product:1")).toEqual({ en: { name: "Soup" } });
  });

  it("hiç geçerli alan kalmazsa kaydı sonuca koymaz", () => {
    const result = normalizeTranslationResult(
      { items: [{ id: "product:1", translations: { en: { name: "  " } } }] },
      ["en"],
      allowed
    );
    expect(result.size).toBe(0);
  });

  it("beklenmeyen girdide çökmez", () => {
    expect(normalizeTranslationResult(null, ["en"], allowed).size).toBe(0);
    expect(normalizeTranslationResult({ items: "olmaz" }, ["en"], allowed).size).toBe(0);
    expect(normalizeTranslationResult({ items: [null, 5] }, ["en"], allowed).size).toBe(0);
  });
});

describe("mergeTranslations", () => {
  it("üretilmeyen dilin mevcut çevirisini silmez", () => {
    const merged = mergeTranslations({ ru: { name: "Суп" } }, { en: { name: "Soup" } });
    expect(merged).toEqual({ ru: { name: "Суп" }, en: { name: "Soup" } });
  });

  it("aynı dilde alan bazında üzerine yazar, diğer alanları korur", () => {
    const merged = mergeTranslations(
      { en: { name: "Old", description: "Kalsın" } },
      { en: { name: "New" } }
    );
    expect(merged.en).toEqual({ name: "New", description: "Kalsın" });
  });

  it("mevcut çeviri yoksa yenisini olduğu gibi yazar", () => {
    expect(mergeTranslations(undefined, { en: { name: "Soup" } })).toEqual({ en: { name: "Soup" } });
  });
});
