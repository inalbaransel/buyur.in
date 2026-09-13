import type { Category, Product } from "@/lib/types";

// "Sepete ekle" sonrası küçük öneri: yanına içecek. İçecek kategorisi ayrı bir
// alanla işaretlenmiyor; kategori adından (ana dil + çeviriler) tanınıyor.
// Saf fonksiyonlar — IO yok, tests/upsell.test.ts ile kilitli.

/** Kelime BAŞI eşleşmesi aranır ("kahveler" ✓, "kahvaltı" ✗). "Soğuk/Sıcak"
 *  bilinçli olarak yok: "Soğuk başlangıçlar" içecek değil. */
const DRINK_PREFIXES = [
  // tr
  "içecek",
  "icecek",
  "kahve",
  "çay",
  "meşrubat",
  "limonata",
  "smoothie",
  "milkshake",
  "frozen",
  "kokteyl",
  "bira",
  "şarap",
  "ayran",
  "şerbet",
  "espresso",
  "latte",
  // en
  "drink",
  "beverage",
  "coffee",
  "tea",
  "juice",
  "soda",
  "cocktail",
  "wine",
  "beer",
  "lemonade",
  "shake",
  // ar
  "مشروب",
  "قهوة",
  "شاي",
  "عصير",
  // ru
  "напит",
  "кофе",
  "чай",
  "сок",
  "коктейл",
];

const WORD_SPLIT = /[\s,.;:!?()[\]{}&/+|·–—_-]+/;

function words(value: string): string[] {
  return value.toLocaleLowerCase("tr").split(WORD_SPLIT).filter(Boolean);
}

export function isDrinkCategory(category: Pick<Category, "name" | "translations">): boolean {
  const names = [category.name, ...Object.values(category.translations ?? {}).map((entry) => entry?.name ?? "")];
  return names.some((name) => words(name).some((word) => DRINK_PREFIXES.some((prefix) => word.startsWith(prefix))));
}

/** Rozetli/indirimli içecekler önce — işletmenin öne çıkardığı ürün önerilsin. */
function promotionScore(product: Product): number {
  const badges = product.badges ?? [];
  const promoted = badges.includes("sefin_onerisi") || badges.includes("populer") ? 2 : 0;
  return promoted + (product.discount_percent > 0 ? 1 : 0);
}

export function upsellSuggestions({
  added,
  categories,
  products,
  cartProductIds,
  limit = 3,
}: {
  added: Product;
  categories: Category[];
  products: Product[];
  cartProductIds: string[];
  limit?: number;
}): Product[] {
  const drinkCategories = new Set(categories.filter(isDrinkCategory).map((category) => category.id));
  if (drinkCategories.size === 0) return [];

  // İçecek eklendiyse "yanına içecek" önermek anlamsız.
  if (drinkCategories.has(added.category)) return [];

  // Sepette zaten içecek varsa müşteriyi bölmüyoruz.
  const inCart = new Set(cartProductIds);
  const byId = new Map(products.map((product) => [product.id, product]));
  for (const id of inCart) {
    const product = byId.get(id);
    if (product && drinkCategories.has(product.category)) return [];
  }

  return products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => drinkCategories.has(product.category) && product.is_available !== false)
    .sort((a, b) => promotionScore(b.product) - promotionScore(a.product) || a.index - b.index)
    .slice(0, limit)
    .map(({ product }) => product);
}
