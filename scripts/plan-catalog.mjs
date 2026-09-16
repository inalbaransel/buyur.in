// Paket kataloğu: üç planın adı, açıklaması, fiyatı, özellik listesi ve
// limitleri. İlk seed (scripts/migrate-plans.mjs), canlı kayıtları güncelleyen
// göç (scripts/migrate-plan-pricing.mjs) VE landing sayfasındaki fiyat kartları
// (components/pricing-plans.tsx) buradan okur — böylece "sitede yazan",
// "kodda yazan" ve "veritabanında duran" paket tanımı ayrışamaz.
//
// Uygulama tarafındaki karşılıkları:
//   · yetki matrisi  → lib/entitlements.ts
//   · ilan fiyatları → lib/pricing.ts
// Fiyat ya da paket içeriği değişince üçü birden güncellenmelidir
// (tests/plan-catalog.test.ts tutarlılığı kilitler).
//
// Özellik metinleri kural: yalnızca ürünün BUGÜN yaptığı iş yazılır. Sipariş
// yönetimi, API erişimi, ürün limiti gibi olmayan şeyler burada yer almaz.

export const PLAN_SEEDS = [
  {
    key: "freemium",
    name: "Freemium",
    description: "Ürünü deneyen küçük işletmeler için: menünü kur, QR'ını yayına al.",
    price_monthly: 0,
    price_yearly_monthly: 0,
    trial_months: 3,
    is_active: true,
    is_default: true,
    order: 0,
    features: [
      "3 ay veya 10.000 menü görüntülenme",
      "Sınırsız ürün ve kategori",
      "QR menü ve size özel menü adresi",
      "Anlık fiyat ve ürün güncelleme",
      "Sepet: müşteri seçimini garsona gösterir",
      "Temel analizler",
    ],
    limits: {
      max_businesses: 1,
      max_menus: 1,
      // Freemium'da ürün limiti YOK: sınır yalnızca süre (3 ay) ve görüntülenme
      // (10.000). İşletme menüsünün tamamını girebilsin ki ürünü kesilen bir
      // menüyle değil, gerçek menüsüyle karar versin.
      max_products: null,
      // Temel analizler Freemium'a dahil (lib/entitlements.ts → basic_analytics).
      analytics: true,
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
    description: "Aktif restoran ve kafeler için: kampanya, analiz ve markasız profesyonel menü.",
    price_monthly: 249,
    price_yearly_monthly: 199.2,
    trial_months: 0,
    is_active: true,
    is_default: false,
    order: 1,
    features: [
      "Süre ve görüntülenme sınırı yok",
      "Kampanyalar ve açılış pop-up'ı",
      "Gelişmiş analizler ve otomatik içgörüler",
      "buyur markasını kaldırma",
      "Özel alan adı",
      "Standart web sitesi (menüden otomatik)",
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
    // Elite'in ana değeri: gelişmiş web sitesi + raporlama + öncelikli hizmet.
    // API/güvenlik araçları ürünün bugün sunduğu şeyler değil; vaat edilmez.
    description: "Premium ve kurumsal işletmeler için: gelişmiş web sitesi, raporlama ve öncelikli hizmet.",
    price_monthly: 749,
    price_yearly_monthly: 599.2,
    trial_months: 0,
    is_active: true,
    is_default: false,
    order: 2,
    features: [
      "Premium'daki her şey",
      "Gelişmiş web sitesi (animasyon · slider · galeri)",
      "Hediye kurumsal web sitesi — kurulumu bizden",
      "Rapor merkezi · PDF ve CSV dışa aktarma",
      "3 yıl analiz geçmişi",
      "Öncelikli teknik destek",
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
];
