// Paket kataloğu: üç planın adı, açıklaması, fiyatı, özellik listesi ve
// limitleri. Hem ilk seed (scripts/migrate-plans.mjs) hem de canlı kayıtları
// güncelleyen göç (scripts/migrate-plan-pricing.mjs) buradan okur — böylece
// "kodda yazan" ile "veritabanında duran" paket tanımı ayrışamaz.
//
// Uygulama tarafındaki karşılıkları:
//   · yetki matrisi  → lib/entitlements.ts
//   · ilan fiyatları → lib/pricing.ts
// Fiyat ya da paket içeriği değişince üçü birden güncellenmelidir.

export const PLAN_SEEDS = [
  {
    key: "freemium",
    name: "Freemium",
    description: "Yeni başlayan işletmeler için 3 ay ücretsiz deneme.",
    price_monthly: 0,
    price_yearly_monthly: 0,
    trial_months: 3,
    is_active: true,
    is_default: true,
    order: 0,
    features: [
      "3 ay veya 10.000 menü görüntülenme",
      "Sınırsız ürün ve kategori",
      "1 restoran",
      "1 dijital menü",
      "QR Menü",
      "Temel analizler",
      "Standart tema",
      "Standart destek",
    ],
    limits: {
      max_businesses: 1,
      max_menus: 1,
      // Freemium'da ürün limiti YOK: sınır yalnızca süre (3 ay) ve görüntülenme
      // (10.000). İşletme menüsünün tamamını girebilsin ki ürünü kesilen bir
      // menüyle değil, gerçek menüsüyle karar versin.
      max_products: null,
      analytics: false,
      custom_domain: false,
      branding_removal: false,
      campaigns: false,
      white_label: false,
      api_access: false,
    },
  },
  {
    key: "premium",
    name: "Premium",
    description: "Büyüyen işletmeler için gelişmiş özellikler.",
    price_monthly: 249,
    price_yearly_monthly: 199.2,
    trial_months: 0,
    is_active: true,
    is_default: false,
    order: 1,
    features: [
      "Sınırsız menü görüntülenme",
      "Sınırsız ürün · süre sınırı yok",
      "Standart Web Sitesi (menüden otomatik)",
      "Gelişmiş analizler ve içgörüler",
      "Menuva markasını kaldırma",
      "Custom Domain desteği",
      "Kampanya oluşturma",
      "Öncelikli destek",
    ],
    limits: {
      max_businesses: null,
      max_menus: null,
      max_products: null,
      analytics: true,
      custom_domain: true,
      branding_removal: true,
      campaigns: true,
      white_label: false,
      api_access: false,
    },
  },
  {
    key: "elite",
    name: "Elite",
    description: "Kurumsal ihtiyaçlar için tüm özellikler.",
    price_monthly: 749,
    price_yearly_monthly: 599.2,
    trial_months: 0,
    is_active: true,
    is_default: false,
    order: 2,
    features: [
      "Premium'daki her şey",
      "Hediye kurumsal web sitesi (kurulumu bizden)",
      "Gelişmiş Web Sitesi deneyimi",
      "Gelişmiş raporlama · PDF/Excel/CSV dışa aktarma",
      "White Label desteği",
      "API erişimi",
      "Öncelikli teknik destek",
      "Beta özelliklerine erken erişim",
    ],
    limits: {
      max_businesses: null,
      max_menus: null,
      max_products: null,
      analytics: true,
      custom_domain: true,
      branding_removal: true,
      campaigns: true,
      white_label: true,
      api_access: true,
    },
  },
];
