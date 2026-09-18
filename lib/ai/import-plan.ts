// Fiziksel menü aktarımının TEKRAR KORUMASI.
//
// Aktarım tek bir PocketBase işlemi değil: kategori kaydı açılır, ardından
// ürünler yazılır. Ortada bir hata olduğunda bir kısmı çoktan yazılmıştır.
// Kullanıcı "hata oluştu" görüp tekrar denediğinde, hiçbir kontrol yoksa aynı
// kategori ve ürünler ikinci kez oluşur — menü çift kayıtla dolar.
//
// Çözüm: her aktarım denemesi öncesinde menünün MEVCUT hâli okunur ve yalnızca
// gerçekten eksik olanlar yazılır. Böylece aktarım idempotent olur; aynı
// taramayı beş kez aktarsanız da sonuç tek bir menüdür.
//
// Saf modül: PocketBase'i bilmez, yalnızca ad eşleştirir. Sözleşmesi
// tests/ai-import-plan.test.ts içinde yazılıdır.

/** Türkçe harf katlamaları — "Çay" ile "cay", "PİDE" ile "pide" aynı üründür. */
const FOLD: Record<string, string> = {
  ı: "i",
  ğ: "g",
  ü: "u",
  ş: "s",
  ö: "o",
  ç: "c",
  â: "a",
  î: "i",
  û: "u",
  é: "e",
};

/** Ad karşılaştırma anahtarı. Büyük/küçük harf, noktalama, fazla boşluk ve
 *  Türkçe aksan farkları yok sayılır: "Türk Kahvesi" = "turk kahvesi". */
export function normalizeEntryName(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[ığüşöçâîûé]/g, (ch) => FOLD[ch] ?? ch)
    // Noktalama ve simgeler ayraç sayılır; "Ayran (büyük)" → "ayran buyuk".
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface ExistingCategory {
  id: string;
  name: string;
  order?: number;
}

export interface ExistingProduct {
  category: string;
  name: string;
  order?: number;
}

interface NamedProduct {
  name: string;
}

interface NamedCategory<P extends NamedProduct> {
  name: string;
  products: P[];
}

export interface PlannedCategory<C, P> {
  draft: C;
  /** Aynı adlı kategori menüde zaten varsa kimliği — yeniden açılmaz. */
  existingId: string | null;
  /** Yeni açılacak kategorinin sıra numarası (mevcutların ardına). */
  order: number;
  /** Gerçekten yazılacak ürünler. */
  newProducts: P[];
  /** Menüde zaten olduğu için atlanan ürün adları. */
  skippedNames: string[];
  /** Yeni ürünlerin başlayacağı sıra numarası. */
  productOrderStart: number;
}

export interface ImportPlan<C, P> {
  categories: PlannedCategory<C, P>[];
  newCategoryCount: number;
  reusedCategoryCount: number;
  newProductCount: number;
  /** Menüde zaten bulunan ve atlanacak ürün sayısı. */
  duplicateProductCount: number;
  /** Taramanın kendi içindeki tekrarlardan birleştirilen kategori sayısı. */
  mergedCategoryCount: number;
  /** Taramanın kendi içindeki tekrarlardan elenen ürün sayısı. */
  mergedProductCount: number;
}

/** Taramanın kendi içindeki tekrarları temizler: aynı adlı kategoriler tek
 *  kategoride birleşir, aynı adlı ürün TÜM menüde bir kez kalır.
 *  (Çok sayfalı menülerde aynı kategori başlığı her sayfada tekrar okunur;
 *  aynı ürün de iki farklı başlığın altında listelenmiş olabilir.) */
export function dedupeScanned<P extends NamedProduct, C extends NamedCategory<P>>(
  categories: C[]
): { categories: C[]; mergedCategoryCount: number; mergedProductCount: number } {
  const byKey = new Map<string, C>();
  const order: C[] = [];
  let mergedCategoryCount = 0;
  let mergedProductCount = 0;

  for (const category of categories) {
    const key = normalizeEntryName(category.name);
    // Adsız kategori eşleştirilmez; kendi başına durur.
    const existing = key === "" ? undefined : byKey.get(key);
    if (existing) {
      existing.products = [...existing.products, ...category.products];
      mergedCategoryCount += 1;
    } else {
      const copy = { ...category, products: [...category.products] } as C;
      if (key !== "") byKey.set(key, copy);
      order.push(copy);
    }
  }

  // Ürün tekilliği işletme genelindedir; sayaç kategoriler arasında paylaşılır.
  const seen = new Set<string>();
  const cleaned = order.map((category) => {
    const products: P[] = [];
    for (const product of category.products) {
      const key = normalizeEntryName(product.name);
      if (key !== "" && seen.has(key)) {
        mergedProductCount += 1;
        continue;
      }
      if (key !== "") seen.add(key);
      products.push(product);
    }
    return { ...category, products } as C;
  });

  return { categories: cleaned, mergedCategoryCount, mergedProductCount };
}

/** Aktarım planı: neyin yazılacağı, neyin atlanacağı.
 *
 *  Kategori adı menüde zaten varsa yeniden açılmaz, ürünler mevcut kategoriye
 *  eklenir. Ad tekilliği işletme genelindedir: menüde aynı adlı bir ürün
 *  varsa, başka bir kategorinin altında bile olsa ikincisi yazılmaz. */
export function buildImportPlan<P extends NamedProduct, C extends NamedCategory<P>>(
  drafts: C[],
  existingCategories: ExistingCategory[],
  existingProducts: ExistingProduct[]
): ImportPlan<C, P> {
  const { categories, mergedCategoryCount, mergedProductCount } = dedupeScanned<P, C>(drafts);

  const categoryByKey = new Map<string, ExistingCategory>();
  for (const category of existingCategories) {
    const key = normalizeEntryName(category.name);
    if (key !== "" && !categoryByKey.has(key)) categoryByKey.set(key, category);
  }

  // Menüde ZATEN bulunan ürün adları — kategori farkı gözetilmez, ad işletme
  // genelinde tekildir. Sıra numarası ise kategori bazında sürer.
  const takenKeys = new Set<string>();
  const maxProductOrder = new Map<string, number>();
  for (const product of existingProducts) {
    const key = normalizeEntryName(product.name);
    if (key !== "") takenKeys.add(key);
    maxProductOrder.set(
      product.category,
      Math.max(maxProductOrder.get(product.category) ?? -1, product.order ?? 0)
    );
  }

  let nextCategoryOrder =
    existingCategories.reduce((max, c) => Math.max(max, c.order ?? 0), -1) + 1;

  const planned: PlannedCategory<C, P>[] = [];
  let newCategoryCount = 0;
  let reusedCategoryCount = 0;
  let newProductCount = 0;
  let duplicateProductCount = 0;

  for (const draft of categories) {
    const key = normalizeEntryName(draft.name);
    const match = key === "" ? undefined : categoryByKey.get(key);
    const existingId = match?.id ?? null;

    const newProducts: P[] = [];
    const skippedNames: string[] = [];
    for (const product of draft.products) {
      const productKey = normalizeEntryName(product.name);
      if (productKey !== "" && takenKeys.has(productKey)) {
        skippedNames.push(product.name);
        duplicateProductCount += 1;
        continue;
      }
      if (productKey !== "") takenKeys.add(productKey);
      newProducts.push(product);
    }

    if (existingId) {
      reusedCategoryCount += 1;
    } else {
      newCategoryCount += 1;
    }
    newProductCount += newProducts.length;

    planned.push({
      draft,
      existingId,
      order: existingId ? (match?.order ?? 0) : nextCategoryOrder++,
      newProducts,
      skippedNames,
      productOrderStart: existingId ? (maxProductOrder.get(existingId) ?? -1) + 1 : 0,
    });
  }

  return {
    categories: planned,
    newCategoryCount,
    reusedCategoryCount,
    newProductCount,
    duplicateProductCount,
    mergedCategoryCount,
    mergedProductCount,
  };
}

/** Plan hiç yazma gerektirmiyor mu — her şey menüde zaten var demektir. */
export function isPlanEmpty(plan: ImportPlan<unknown, unknown>): boolean {
  return plan.newProductCount === 0 && plan.newCategoryCount === 0;
}
