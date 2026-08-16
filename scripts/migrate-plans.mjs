// businesses.plan alanını eski anahtarlardan (ucretsiz/baslangic/pro/isletme)
// yeni anahtarlara (freemium/premium/elite) taşır ve `plans` koleksiyonunu
// spec'teki fiyat/özelliklerle seed eder.
//
// scripts/setup-pocketbase.mjs'in getOrCreate'i var olan bir alanın seçenek
// listesini güncellemez (sadece eksik alan ekler) — bu yüzden select alanının
// values listesi burada üç adımda değiştiriliyor: genişlet → kayıtları eşle →
// daralt. Idempotent: plan alanı zaten yeni değerlerdeyse taşıma adımını,
// bir plan kaydı zaten varsa seed adımını atlar (var olan plan kayıtlarının
// fiyat/özelliklerine dokunmaz — onlar admin panelinden yönetilir).
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-plans.mjs
// Önkoşul: scripts/setup-pocketbase.mjs bir kere çalıştırılmış olmalı (plans koleksiyonu var olsun).

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const OLD_TO_NEW = {
  ucretsiz: "freemium",
  baslangic: "premium",
  pro: "premium",
  isletme: "elite",
};

const NEW_VALUES = ["freemium", "premium", "elite"];

const PLAN_SEEDS = [
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
      "3 ay ücretsiz kullanım",
      "1 restoran",
      "1 dijital menü",
      "Maksimum 30 ürün",
      "QR Menü",
      "Temel sipariş yönetimi",
      "Standart tema",
      "Standart destek",
    ],
    limits: {
      max_businesses: 1,
      max_menus: 1,
      max_products: 30,
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
    price_monthly: 250,
    price_yearly_monthly: 200,
    trial_months: 0,
    is_active: true,
    is_default: false,
    order: 1,
    features: [
      "Sınırsız menü",
      "Sınırsız ürün",
      "Gelişmiş tema seçenekleri",
      "Gelişmiş analizler",
      "Menuva markasını kaldırma",
      "Custom Domain desteği",
      "Öncelikli destek",
      "Kampanya oluşturma",
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
    price_monthly: 500,
    price_yearly_monthly: 400,
    trial_months: 0,
    is_active: true,
    is_default: false,
    order: 2,
    features: [
      "Premium'daki her şey",
      "White Label desteği",
      "API erişimi",
      "Gelişmiş raporlama",
      "Öncelikli teknik destek",
      "Beta özelliklerine erken erişim",
      "Gelişmiş güvenlik araçları",
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

async function migrateBusinessPlanValues() {
  const collection = await pb.collections.getOne("menuva_businesses");
  const planField = collection.fields.find((f) => f.name === "plan");
  if (!planField) throw new Error("businesses koleksiyonunda 'plan' alanı bulunamadı.");

  const hasOldValues = Object.keys(OLD_TO_NEW).some((v) => planField.values.includes(v));
  if (!hasOldValues) {
    console.log("= plan alanı zaten yeni değerlerde, taşıma adımı atlanıyor.");
    return;
  }

  // 1) Genişlet: eski + yeni değerler bir arada — kayıtları güvenle güncelleyebilelim diye.
  const widened = Array.from(new Set([...planField.values, ...NEW_VALUES]));
  await pb.collections.update(collection.id, {
    fields: collection.fields.map((f) => (f.name === "plan" ? { ...f, values: widened } : f)),
  });
  console.log(`~ plan alanı geçici olarak genişletildi: ${widened.join(", ")}`);

  // 2) Kayıtları eşle.
  let page = 1;
  let migrated = 0;
  for (;;) {
    const result = await pb.collection("menuva_businesses").getList(page, 200);
    for (const biz of result.items) {
      const mapped = OLD_TO_NEW[biz.plan];
      if (mapped) {
        await pb.collection("menuva_businesses").update(biz.id, { plan: mapped });
        migrated += 1;
      }
    }
    if (page >= result.totalPages) break;
    page += 1;
  }
  console.log(`~ ${migrated} işletme kaydı yeni plan anahtarına taşındı.`);

  // 3) Daralt: sadece nihai değerler kalsın.
  const fresh = await pb.collections.getOne("menuva_businesses");
  await pb.collections.update(fresh.id, {
    fields: fresh.fields.map((f) => (f.name === "plan" ? { ...f, values: NEW_VALUES } : f)),
  });
  console.log(`~ plan alanı nihai değerlere daraltıldı: ${NEW_VALUES.join(", ")}`);
}

async function seedPlans() {
  for (const spec of PLAN_SEEDS) {
    let existing;
    try {
      existing = await pb.collection("menuva_plans").getFirstListItem(pb.filter("key = {:key}", { key: spec.key }));
    } catch (err) {
      if (err?.status !== 404) throw err;
    }
    if (existing) {
      console.log(`= plans/${spec.key} zaten var, atlanıyor (id: ${existing.id}). Fiyat/özellik değişiklikleri admin panelinden yapılmalı.`);
      continue;
    }
    const created = await pb.collection("menuva_plans").create(spec);
    console.log(`+ plans/${spec.key} oluşturuldu (id: ${created.id})`);
  }
}

async function main() {
  await migrateBusinessPlanValues();
  await seedPlans();
  console.log("\nPlan göçü tamamlandı.");
}

main().catch((err) => {
  console.error("Hata:", err?.response ?? err);
  process.exit(1);
});
