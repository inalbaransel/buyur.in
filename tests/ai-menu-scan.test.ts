import { describe, expect, it } from "vitest";
import {
  buildScanPrompt,
  MAX_CATEGORIES,
  normalizeCurrency,
  normalizeScanResult,
  parsePrice,
} from "@/lib/ai/menu-scan";
import { buildImageQuery } from "@/lib/ai/images";

// Fiziksel menü taramasının sözleşmesi. Korunan en kritik kural:
// MODEL ASLA TAHMİN ETTİRİLMEZ. Okunamayan fiyat 0 ya da uydurma bir sayı
// değil, null döner ve "price" işaretiyle kullanıcıya gösterilir. Menüye giren
// yanlış bir fiyat, işletmeyi masadaki müşteriyle karşı karşıya bırakır.

describe("parsePrice", () => {
  it("sayıyı olduğu gibi kabul eder", () => {
    expect(parsePrice(45)).toBe(45);
    expect(parsePrice(0)).toBe(0);
  });

  it("para birimi simgesini ve boşluğu temizler", () => {
    expect(parsePrice("45 ₺")).toBe(45);
    expect(parsePrice("$12.50")).toBe(12.5);
    expect(parsePrice("  89 TL ")).toBe(89);
  });

  it("virgüllü ondalığı Türkçe biçimiyle çözer", () => {
    expect(parsePrice("45,50")).toBe(45.5);
    expect(parsePrice("45,5")).toBe(45.5);
  });

  it("binlik ayracını ondalıkla karıştırmaz", () => {
    expect(parsePrice("1.250")).toBe(1250);
    expect(parsePrice("1,250")).toBe(1250);
    expect(parsePrice("1.250,75")).toBe(1250.75);
  });

  it("okunamayan değerde TAHMİN ETMEZ, null döner", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("?")).toBeNull();
    expect(parsePrice("günün fiyatı")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });

  it("negatif ve geçersiz sayıyı reddeder", () => {
    expect(parsePrice(-5)).toBeNull();
    expect(parsePrice(Number.NaN)).toBeNull();
    expect(parsePrice(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("normalizeCurrency", () => {
  it("simgeyi ISO koduna çevirir", () => {
    expect(normalizeCurrency("₺")).toBe("TRY");
    expect(normalizeCurrency("TL")).toBe("TRY");
    expect(normalizeCurrency("$")).toBe("USD");
    expect(normalizeCurrency("€")).toBe("EUR");
  });

  it("tanınmayan değeri boş bırakır", () => {
    expect(normalizeCurrency("altın")).toBe("");
    expect(normalizeCurrency("")).toBe("");
    expect(normalizeCurrency(42)).toBe("");
  });
});

describe("normalizeScanResult", () => {
  it("okunamayan fiyatı null bırakıp 'price' olarak işaretler", () => {
    const result = normalizeScanResult({
      categories: [
        { name: "Çorbalar", products: [{ name: "Mercimek", description: "", price: "günün fiyatı" }] },
      ],
    });

    const product = result.categories[0].products[0];
    expect(product.price).toBeNull();
    expect(product.uncertain).toContain("price");
    expect(result.uncertainCount).toBe(1);
  });

  it("adı okunamayan ürünü ve kategoriyi eler — uydurma başlık altına toplamaz", () => {
    const result = normalizeScanResult({
      categories: [
        { name: "", products: [{ name: "Ayran", price: 20 }] },
        { name: "Tatlılar", products: [{ name: "", price: 60 }, { name: "Künefe", price: 120 }] },
      ],
    });

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe("Tatlılar");
    expect(result.categories[0].products).toHaveLength(1);
    expect(result.categories[0].products[0].name).toBe("Künefe");
  });

  it("ürünü kalmayan kategoriyi menüye boş başlık olarak taşımaz", () => {
    const result = normalizeScanResult({
      categories: [{ name: "İçecekler", products: [] }],
    });
    expect(result.categories).toHaveLength(0);
  });

  it("baskın para birimini oyla belirler", () => {
    const result = normalizeScanResult({
      categories: [
        {
          name: "Kahveler",
          products: [
            { name: "Espresso", price: 45, currency: "₺" },
            { name: "Latte", price: 65, currency: "TL" },
            { name: "Mocha", price: 70, currency: "$" },
          ],
        },
      ],
    });
    expect(result.currency).toBe("TRY");
  });

  it("modelin bildirdiği belirsizlikleri taşır, tanınmayan anahtarları atar", () => {
    const result = normalizeScanResult({
      categories: [
        {
          name: "Ana Yemek",
          products: [
            { name: "Köfte", description: "", price: 180, uncertain: ["description", "renk", "price"] },
          ],
        },
      ],
    });

    const product = result.categories[0].products[0];
    expect(product.uncertain).toContain("description");
    expect(product.uncertain).not.toContain("renk");
  });

  it("fiyat okunduysa modelin yanlış 'price' işaretini korumaz sayılmaz — işaret modelden gelirse kalır", () => {
    const result = normalizeScanResult({
      categories: [{ name: "Salatalar", products: [{ name: "Sezar", price: 150, uncertain: ["price"] }] }],
    });
    // Model şüphelendiyse kullanıcı da görsün: işaret korunur.
    expect(result.categories[0].products[0].price).toBe(150);
    expect(result.categories[0].products[0].uncertain).toContain("price");
  });

  it("beklenmeyen girdide çökmez, boş sonuç döner", () => {
    expect(normalizeScanResult(null).categories).toHaveLength(0);
    expect(normalizeScanResult({}).categories).toHaveLength(0);
    expect(normalizeScanResult({ categories: "olmaz" }).categories).toHaveLength(0);
    expect(normalizeScanResult({ categories: [null, 5, "x"] }).categories).toHaveLength(0);
  });

  it("aşırı uzun çıktıyı üst sınırda keser", () => {
    const categories = Array.from({ length: MAX_CATEGORIES + 20 }, (_, i) => ({
      name: `Kategori ${i}`,
      products: [{ name: `Ürün ${i}`, price: 10 }],
    }));
    expect(normalizeScanResult({ categories }).categories).toHaveLength(MAX_CATEGORIES);
  });

  it("metinleri kırpar ve fazla boşluğu toplar", () => {
    const result = normalizeScanResult({
      categories: [{ name: "  Kahvaltı  ", products: [{ name: " Menemen\n\n ", price: 90 }] }],
    });
    expect(result.categories[0].name).toBe("Kahvaltı");
    expect(result.categories[0].products[0].name).toBe("Menemen");
  });
});

describe("buildImageQuery", () => {
  it("porsiyon, ölçü ve fiyat gürültüsünü atar", () => {
    expect(buildImageQuery("Cheeseburger (250 gr)")).toBe("Cheeseburger food");
    expect(buildImageQuery("Pizza Margherita 32 cm")).toBe("Pizza Margherita food");
  });

  it("ürün adı boşsa kategoriye düşer", () => {
    expect(buildImageQuery("1250", "Tatlılar")).toBe("Tatlılar food");
  });

  it("hiçbir ipucu yoksa boş döner — arama yapılmaz", () => {
    expect(buildImageQuery("", "")).toBe("");
    expect(buildImageQuery("123 ₺", "")).toBe("");
  });
});

describe("buildScanPrompt", () => {
  it("işletmenin ana dil adını prompta yazar", () => {
    const prompt = buildScanPrompt("Русский");
    expect(prompt).toContain("Русский");
    expect(prompt).not.toContain("${localeName}");
  });

  it("açıklama yoksa boş bırakmayı ve çeviri yapmamayı ister", () => {
    const prompt = buildScanPrompt("Türkçe");
    expect(prompt).toContain("description alanını boş bırak");
    expect(prompt).toContain("çevirme");
  });
});
