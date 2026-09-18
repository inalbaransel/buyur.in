import { describe, expect, it } from "vitest";
import {
  buildImportPlan,
  dedupeScanned,
  isPlanEmpty,
  normalizeEntryName,
} from "@/lib/ai/import-plan";

// Fiziksel menü aktarımının TEKRAR SÖZLEŞMESİ.
//
// Korunan kural: aynı taramayı kaç kez aktarırsanız aktarın menü tek kalır.
// Aktarım ortasında bağlantı koptuğunda yazılanlar menüde kalır; kullanıcı
// "hata oluştu" görüp tekrar denediğinde yalnızca eksikler yazılmalıdır.
// Bu sözleşme bozulursa panel çift kategori ve çift ürünle dolar.

interface P {
  name: string;
  price?: number;
}
interface C {
  name: string;
  products: P[];
}

const cat = (name: string, ...products: string[]): C => ({
  name,
  products: products.map((p) => ({ name: p })),
});

describe("normalizeEntryName", () => {
  it("büyük/küçük harfi ve fazla boşluğu yok sayar", () => {
    expect(normalizeEntryName("  Türk   Kahvesi ")).toBe(normalizeEntryName("türk kahvesi"));
  });

  it("Türkçe büyük İ/I harflerini doğru katlar", () => {
    expect(normalizeEntryName("PİDE")).toBe(normalizeEntryName("pide"));
    expect(normalizeEntryName("IŞKEMBE")).toBe(normalizeEntryName("ışkembe"));
  });

  it("aksan ve noktalama farkını yok sayar", () => {
    expect(normalizeEntryName("Çay")).toBe(normalizeEntryName("cay"));
    expect(normalizeEntryName("Ayran (büyük)")).toBe(normalizeEntryName("ayran buyuk"));
  });

  it("farklı ürünleri birbirine karıştırmaz", () => {
    expect(normalizeEntryName("Latte")).not.toBe(normalizeEntryName("Latte Macchiato"));
  });
});

describe("dedupeScanned", () => {
  it("aynı adlı kategorileri tek kategoride birleştirir", () => {
    const { categories, mergedCategoryCount } = dedupeScanned([
      cat("Sıcak İçecekler", "Çay"),
      cat("sicak icecekler", "Kahve"),
    ]);

    expect(categories).toHaveLength(1);
    expect(categories[0].products.map((p) => p.name)).toEqual(["Çay", "Kahve"]);
    expect(mergedCategoryCount).toBe(1);
  });

  it("bir kategoride aynı ürünü bir kez bırakır", () => {
    const { categories, mergedProductCount } = dedupeScanned([cat("Tatlılar", "Baklava", "baklava")]);

    expect(categories[0].products).toHaveLength(1);
    expect(mergedProductCount).toBe(1);
  });

  it("adsız kategorileri birbirine yapıştırmaz", () => {
    const { categories } = dedupeScanned([cat("", "A"), cat("", "B")]);
    expect(categories).toHaveLength(2);
  });
});

describe("buildImportPlan", () => {
  it("boş menüye her şeyi yeni yazar", () => {
    const plan = buildImportPlan([cat("İçecekler", "Çay", "Kahve")], [], []);

    expect(plan.newCategoryCount).toBe(1);
    expect(plan.newProductCount).toBe(2);
    expect(plan.duplicateProductCount).toBe(0);
    expect(plan.categories[0].existingId).toBeNull();
  });

  it("mevcut kategoriyi yeniden açmaz, ürünü onun altına ekler", () => {
    const plan = buildImportPlan(
      [cat("İçecekler", "Ayran")],
      [{ id: "cat1", name: "içecekler", order: 0 }],
      [{ category: "cat1", name: "Çay", order: 0 }]
    );

    expect(plan.newCategoryCount).toBe(0);
    expect(plan.reusedCategoryCount).toBe(1);
    expect(plan.categories[0].existingId).toBe("cat1");
    expect(plan.categories[0].newProducts.map((p) => p.name)).toEqual(["Ayran"]);
  });

  it("menüde zaten olan ürünü ikinci kez yazmaz", () => {
    const plan = buildImportPlan(
      [cat("İçecekler", "Çay", "Ayran")],
      [{ id: "cat1", name: "İçecekler", order: 0 }],
      [{ category: "cat1", name: "çay", order: 0 }]
    );

    expect(plan.newProductCount).toBe(1);
    expect(plan.duplicateProductCount).toBe(1);
    expect(plan.categories[0].skippedNames).toEqual(["Çay"]);
  });

  // Asıl senaryo: aktarım yarıda hata verdi, kullanıcı tekrar bastı.
  it("yarıda kalan aktarımı tekrarlayınca yalnızca eksikleri yazar", () => {
    const draft = [cat("İçecekler", "Çay", "Ayran"), cat("Tatlılar", "Baklava")];

    // İlk denemede "İçecekler" ve içindeki iki ürün yazıldı, sonra koptu.
    const afterPartial = buildImportPlan(
      draft,
      [{ id: "cat1", name: "İçecekler", order: 0 }],
      [
        { category: "cat1", name: "Çay", order: 0 },
        { category: "cat1", name: "Ayran", order: 1 },
      ]
    );

    expect(afterPartial.newCategoryCount).toBe(1); // yalnızca Tatlılar
    expect(afterPartial.newProductCount).toBe(1); // yalnızca Baklava
    expect(afterPartial.duplicateProductCount).toBe(2);
  });

  it("tamamı aktarılmış bir menüyü yeniden aktarmaz", () => {
    const plan = buildImportPlan(
      [cat("İçecekler", "Çay")],
      [{ id: "cat1", name: "İçecekler", order: 0 }],
      [{ category: "cat1", name: "Çay", order: 0 }]
    );

    expect(isPlanEmpty(plan)).toBe(true);
    expect(plan.newProductCount).toBe(0);
  });

  it("yeni kategoriler mevcutların ardına sıralanır", () => {
    const plan = buildImportPlan(
      [cat("Tatlılar", "Baklava"), cat("Salatalar", "Çoban")],
      [{ id: "cat1", name: "İçecekler", order: 4 }],
      []
    );

    expect(plan.categories.map((c) => c.order)).toEqual([5, 6]);
  });

  it("mevcut kategoriye eklenen ürün en sondaki sıradan devam eder", () => {
    const plan = buildImportPlan(
      [cat("İçecekler", "Ayran")],
      [{ id: "cat1", name: "İçecekler", order: 0 }],
      [
        { category: "cat1", name: "Çay", order: 0 },
        { category: "cat1", name: "Kahve", order: 3 },
      ]
    );

    expect(plan.categories[0].productOrderStart).toBe(4);
  });

  it("başka kategorideki aynı adlı ürün engel olmaz", () => {
    const plan = buildImportPlan(
      [cat("Kahvaltı", "Çay")],
      [
        { id: "cat1", name: "İçecekler", order: 0 },
        { id: "cat2", name: "Kahvaltı", order: 1 },
      ],
      [{ category: "cat1", name: "Çay", order: 0 }]
    );

    expect(plan.newProductCount).toBe(1);
    expect(plan.duplicateProductCount).toBe(0);
  });

  it("taramanın kendi tekrarını da eler", () => {
    const plan = buildImportPlan(
      [cat("İçecekler", "Çay", "çay"), cat("icecekler", "Kahve")],
      [],
      []
    );

    expect(plan.categories).toHaveLength(1);
    expect(plan.newProductCount).toBe(2);
    expect(plan.mergedCategoryCount).toBe(1);
    expect(plan.mergedProductCount).toBe(1);
  });
});
