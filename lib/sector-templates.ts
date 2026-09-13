import type { Template } from "@/lib/types";

// İlk girişte örnek veri yerine sektör şablonu: işletme boş bir panelle değil,
// kendi sektörünün kategori iskeletiyle başlar. Ürün eklenmemiş kategoriler
// müşteri menüsünde görünmez (bkz. MenuProvider), yani yarım menü yayına çıkmaz.

export type SectorKey = "kafe" | "restoran" | "pastane" | "bar" | "bos";

export interface SectorTemplate {
  key: SectorKey;
  label: string;
  description: string;
  /** Menü görünümü: görsel ağırlıklı sektörlerde grid. */
  template: Template;
  categories: string[];
}

export const SECTOR_TEMPLATES: SectorTemplate[] = [
  {
    key: "kafe",
    label: "Kafe",
    description: "Kahve, tatlı ve atıştırmalık",
    template: "liste",
    categories: ["Sıcak Kahveler", "Soğuk Kahveler", "Çaylar", "Soğuk İçecekler", "Tatlılar", "Atıştırmalıklar"],
  },
  {
    key: "restoran",
    label: "Restoran",
    description: "Başlangıçtan tatlıya tam menü",
    template: "liste",
    categories: ["Başlangıçlar", "Çorbalar", "Salatalar", "Ana Yemekler", "Tatlılar", "İçecekler"],
  },
  {
    key: "pastane",
    label: "Pastane",
    description: "Görsel ağırlıklı vitrin menüsü",
    template: "grid",
    categories: ["Pastalar", "Dilim Tatlılar", "Kurabiye & Kuru Pasta", "Börek & Poğaça", "Sıcak İçecekler", "Soğuk İçecekler"],
  },
  {
    key: "bar",
    label: "Bar",
    description: "Kokteyl, içki ve atıştırmalık",
    template: "liste",
    categories: ["Kokteyller", "Biralar", "Şaraplar", "Rakı & Viski", "Alkolsüz İçecekler", "Atıştırmalıklar"],
  },
  {
    key: "bos",
    label: "Boş başla",
    description: "Kategorileri kendim oluşturacağım",
    template: "liste",
    categories: [],
  },
];

export function sectorTemplate(key: string | null | undefined): SectorTemplate {
  return SECTOR_TEMPLATES.find((item) => item.key === key) ?? SECTOR_TEMPLATES[SECTOR_TEMPLATES.length - 1]!;
}
