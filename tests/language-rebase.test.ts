import { describe, expect, it } from "vitest";
import { tField, type Translatable } from "@/lib/i18n";
import { rebaseEntity, rebasePatchData } from "@/lib/language-rebase";

const PRODUCT_FIELDS = ["name", "description", "campaign_label"] as const;

function product(overrides: Partial<Translatable> = {}): Translatable {
  return { name: "Köfte", description: "El yapımı", campaign_label: "", translations: {}, ...overrides };
}

describe("rebaseEntity", () => {
  it("eski ana dilin metinlerini çeviri olarak saklar (veri kaybı yok)", () => {
    const entity = product({ translations: { en: { name: "Meatball", description: "Handmade" } } });
    const { base, translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");

    expect(base.name).toBe("Meatball");
    expect(base.description).toBe("Handmade");
    expect(translations.tr).toEqual({ name: "Köfte", description: "El yapımı" });
    expect(translations.en).toBeUndefined();
  });

  it("yeni ana dilde çeviri yoksa mevcut metni korur", () => {
    const entity = product({ translations: { en: { description: "Handmade" } } });
    const { base, translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");

    expect(base.name).toBe("Köfte");
    expect(base.description).toBe("Handmade");
    expect(translations.tr).toEqual({ name: "Köfte", description: "El yapımı" });
  });

  it("diğer dillerin çevirilerine dokunmaz", () => {
    const entity = product({
      translations: { en: { name: "Meatball" }, ar: { name: "كفتة" }, ru: { name: "Котлета" } },
    });
    const { translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");

    expect(translations.ar).toEqual({ name: "كفتة" });
    expect(translations.ru).toEqual({ name: "Котлета" });
  });

  it("girilmiş metinler taşıma sonrası da aynı dilde okunur", () => {
    const entity = product({
      campaign_label: "Haftanın kampanyası",
      translations: {
        en: { name: "Meatball", description: "Handmade" },
        ru: { name: "Котлета" },
      },
    });
    const before = (["tr", "en", "ru"] as const).map((locale) => ({
      locale,
      name: tField(entity, "name", locale, "tr"),
    }));

    const { base, translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");
    const after: Translatable = { ...base, translations };

    for (const snapshot of before) {
      expect(tField(after, "name", snapshot.locale, "en")).toBe(snapshot.name);
    }
    // Eski ana dilin yalnızca baz alanda duran metinleri de erişilebilir kalır.
    expect(tField(after, "description", "tr", "en")).toBe("El yapımı");
    expect(tField(after, "campaign_label", "tr", "en")).toBe("Haftanın kampanyası");
  });

  it("çevirisi olmayan diller artık yeni ana dile düşer", () => {
    const entity = product({ translations: { en: { name: "Meatball", description: "Handmade" }, ru: {} } });
    const { base, translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");
    const after: Translatable = { ...base, translations };

    // Rusça çeviri girilmemiş: eskiden Türkçe'ye düşüyordu, artık İngilizce'ye.
    expect(tField(after, "description", "ru", "en")).toBe("Handmade");
  });

  it("boş baz alan için eski dilde boş kutu bırakmaz", () => {
    const entity = product({ name: "Köfte", description: "", translations: { en: { name: "Meatball" } } });
    const { translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");

    expect(translations.tr).toEqual({ name: "Köfte" });
    expect(translations.tr?.description).toBeUndefined();
  });

  it("çevirisi olmayan kayıtta tekrar uygulanabilir (idempotent)", () => {
    const entity = product({ translations: {} });
    const first = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");
    const second = rebaseEntity({ ...first.base, translations: first.translations }, PRODUCT_FIELDS, "tr", "en");

    expect(second.base).toEqual(first.base);
    expect(second.translations).toEqual(first.translations);
  });

  it("eski ana dilin çeviri kutusu doluysa üzerine yazmaz", () => {
    // Taşıma yapmadan ana dili tr→en değiştirmiş eski bir kayıt: baz alanlar
    // hâlâ Türkçe, gerçek İngilizce metin translations.en'de. Geri alırken
    // (en→tr) İngilizce çeviri korunmalı, Türkçe baz metin baz kalmalı.
    const entity = product({ translations: { en: { name: "Meatball", description: "Handmade" } } });
    const { base, translations } = rebaseEntity(entity, PRODUCT_FIELDS, "en", "tr");

    expect(base.name).toBe("Köfte");
    expect(base.description).toBe("El yapımı");
    expect(translations.en).toEqual({ name: "Meatball", description: "Handmade" });
  });

  it("aynı dile taşımada hiçbir şeyi değiştirmez", () => {
    const entity = product({ translations: { en: { name: "Meatball" } } });
    const { base, translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "tr");

    expect(base.name).toBe("Köfte");
    expect(translations).toEqual({ en: { name: "Meatball" } });
  });

  it("desteklenmeyen dil kodlarını korur", () => {
    const entity = product({ translations: { en: { name: "Meatball" }, de: { name: "Frikadelle" } } as never });
    const { translations } = rebaseEntity(entity, PRODUCT_FIELDS, "tr", "en");

    expect((translations as Record<string, unknown>).de).toEqual({ name: "Frikadelle" });
  });
});

describe("rebasePatchData", () => {
  it("değişmeyen kayıt için güncelleme üretmez", () => {
    const entity: Translatable = { title: "", message: "", translations: {} };
    expect(rebasePatchData(entity, ["title", "message"], "tr", "en")).toBeNull();
  });

  it("baz alanları ve çevirileri tek gövdede döndürür", () => {
    const entity = product({ translations: { en: { name: "Meatball" } } });
    const data = rebasePatchData(entity, PRODUCT_FIELDS, "tr", "en");

    expect(data).toEqual({
      name: "Meatball",
      description: "El yapımı",
      campaign_label: "",
      translations: { tr: { name: "Köfte", description: "El yapımı" } },
    });
  });
});
