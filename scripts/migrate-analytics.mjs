// Analitik altyapısı göçü (Faz 1). Mevcut bir kurulumu yeni event şemasına taşır:
//
//   1) buyur_events.type select listesini yeni event sözlüğüne genişletir
//      (getOrCreate var olan bir alanın değer listesini güncellemez).
//   2) buyur_events üzerindeki analitik indekslerini ekler.
//   3) Plan kayıtlarındaki limits'e yeni analitik yetkilerini yazar.
//   4) Saat dilimi boş olan işletmelere varsayılanı yazar.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-analytics.mjs
// Önkoşul: scripts/setup-pocketbase.mjs bu sürümle bir kez çalıştırılmış olmalı
// (yeni alanlar ve koleksiyonlar oradan geliyor).
// Idempotent: her adım zaten uygulanmışsa atlanır.

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const DEFAULT_TIMEZONE = "Europe/Istanbul";

const EVENT_TYPES = [
  "page_view",
  "qr_scan",
  "session_start",
  "session_end",
  "category_view",
  "product_view",
  "product_detail_view",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "search",
  "campaign_view",
  "campaign_click",
  "language_change",
];

const EVENT_INDEXES = [
  "CREATE INDEX `idx_events_business_time` ON `buyur_events` (`business`, `occurred_at`)",
  "CREATE INDEX `idx_events_business_type_time` ON `buyur_events` (`business`, `type`, `occurred_at`)",
  "CREATE INDEX `idx_events_business_session` ON `buyur_events` (`business`, `session`)",
  "CREATE INDEX `idx_events_business_product` ON `buyur_events` (`business`, `product`, `occurred_at`)",
];

// Plan bazlı analitik yetkileri — docs/analytics-architecture.md §6 ile aynı.
const PLAN_ANALYTICS = {
  freemium: {
    analytics: true,
    analytics_advanced: false,
    insights: false,
    reports: false,
    reports_export: false,
    scheduled_reports: false,
    analytics_retention_days: 30,
  },
  premium: {
    analytics: true,
    analytics_advanced: true,
    insights: true,
    reports: false,
    reports_export: false,
    scheduled_reports: false,
    analytics_retention_days: 365,
  },
  elite: {
    analytics: true,
    analytics_advanced: true,
    insights: true,
    reports: true,
    reports_export: true,
    scheduled_reports: false,
    analytics_retention_days: 1095,
  },
};

async function widenEventTypes() {
  const collection = await pb.collections.getOne("buyur_events");
  const field = collection.fields.find((f) => f.name === "type");
  if (!field) throw new Error("buyur_events içinde 'type' alanı bulunamadı.");

  const missing = EVENT_TYPES.filter((value) => !field.values.includes(value));
  if (missing.length === 0) {
    console.log("= event type listesi zaten güncel.");
    return;
  }

  // Genişletme: eski değerler korunur (geçmiş kayıtlar geçersiz olmasın).
  const values = Array.from(new Set([...field.values, ...EVENT_TYPES]));
  await pb.collections.update(collection.id, {
    fields: collection.fields.map((f) => (f.name === "type" ? { ...f, values } : f)),
  });
  console.log(`~ event type listesi genişletildi: +${missing.join(", ")}`);
}

async function addEventIndexes() {
  const collection = await pb.collections.getOne("buyur_events");
  const existing = collection.indexes ?? [];
  const nameOf = (sql) => sql.match(/`([^`]+)`\s+ON/)?.[1] ?? sql;
  const existingNames = new Set(existing.map(nameOf));

  const missing = EVENT_INDEXES.filter((sql) => !existingNames.has(nameOf(sql)));
  if (missing.length === 0) {
    console.log("= event indeksleri zaten yerinde.");
    return;
  }

  await pb.collections.update(collection.id, { indexes: [...existing, ...missing] });
  console.log(`~ ${missing.length} analitik indeksi eklendi.`);
}

async function updatePlanLimits() {
  const plans = await pb.collection("buyur_plans").getFullList();

  for (const plan of plans) {
    const wanted = PLAN_ANALYTICS[plan.key];
    if (!wanted) {
      console.log(`! plans/${plan.key} analitik tablosunda yok, atlanıyor.`);
      continue;
    }

    const limits = { ...(plan.limits ?? {}) };
    const changed = Object.entries(wanted).filter(([field, value]) => limits[field] !== value);
    if (changed.length === 0) {
      console.log(`= plans/${plan.key} analitik yetkileri zaten güncel.`);
      continue;
    }

    await pb.collection("buyur_plans").update(plan.id, { limits: { ...limits, ...wanted } });
    console.log(`~ plans/${plan.key}: ${changed.map(([f, v]) => `${f}=${v}`).join(", ")}`);
  }
}

/** Göç öncesi yazılmış event'lerde `occurred_at` yok; rollup bu alana göre
 *  sorguladığı için eski veri analitiğe hiç girmez. Kayıt zamanını (created)
 *  occurred_at'e kopyalayarak geçmişi kurtarıyoruz.
 *
 *  Not: eski kayıtlarda oturum/ziyaretçi bilgisi olmadığı için o günlerde
 *  görüntülenme sayıları görünür, oturum bazlı metrikler (tekil ziyaretçi,
 *  süre, bounce, funnel) boş kalır — uydurmak yerine boş bırakıyoruz. */
async function backfillOccurredAt() {
  let migrated = 0;

  for (;;) {
    const batch = await pb.collection("buyur_events").getList(1, 200, {
      filter: "occurred_at = ''",
      fields: "id,created",
      sort: "created",
    });

    if (batch.items.length === 0) break;

    for (const event of batch.items) {
      await pb.collection("buyur_events").update(event.id, { occurred_at: event.created });
      migrated += 1;
    }

    if (batch.totalItems <= batch.items.length) break;
  }

  console.log(
    migrated === 0
      ? "= occurred_at boş event yok."
      : `~ ${migrated} eski event'in occurred_at alanı kayıt zamanından dolduruldu.`
  );
}

async function backfillTimezones() {
  const businesses = await pb.collection("buyur_businesses").getFullList({
    filter: "timezone = ''",
    fields: "id",
  });

  if (businesses.length === 0) {
    console.log("= saat dilimi boş işletme yok.");
    return;
  }

  for (const business of businesses) {
    await pb.collection("buyur_businesses").update(business.id, { timezone: DEFAULT_TIMEZONE });
  }
  console.log(`~ ${businesses.length} işletmeye saat dilimi yazıldı: ${DEFAULT_TIMEZONE}`);
}

/** Freemium kullanım alanlarını doldurur:
 *  - freemium_started_at: Freemium işletmelerde bitişten 3 ay geriye (yoksa kayıt tarihi)
 *  - menu_views: agregatlardan gerçek sayfa görüntülenme toplamı
 *  - ücretli plandaki işletmelerde kalmış limit alanlarını temizler
 *  (bkz. lib/entitlements.ts — limitler yalnızca Freemium'a aittir). */
async function backfillPlanUsage() {
  const businesses = await pb.collection("buyur_businesses").getFullList({
    fields: "id,name,plan,created,plan_expires_at,freemium_started_at,menu_views",
  });

  let updated = 0;

  for (const business of businesses) {
    const patch = {};

    if (business.plan === "freemium") {
      if (!business.freemium_started_at) {
        const expires = business.plan_expires_at ? new Date(business.plan_expires_at.replace(" ", "T")) : null;
        const started = expires ? new Date(expires.getTime() - 90 * 86_400_000) : new Date(business.created.replace(" ", "T"));
        patch.freemium_started_at = started.toISOString();
      }

      // Gerçek görüntülenme: günlük agregatların "page_views" toplamı.
      const stats = await pb.collection("buyur_stats_daily").getFullList({
        filter: pb.filter("business = {:b} && dimension = {:d}", { b: business.id, d: "total" }),
        fields: "metrics",
        batch: 500,
      });
      const views = stats.reduce((sum, row) => sum + (row.metrics?.page_views ?? 0), 0);
      if ((business.menu_views ?? 0) !== views) patch.menu_views = views;
    } else {
      // Ücretli plan: Freemium alanları uygulanmaz, temiz kalsın.
      if (business.plan_expires_at) patch.plan_expires_at = "";
      if (business.freemium_started_at) patch.freemium_started_at = "";
    }

    if (Object.keys(patch).length > 0) {
      await pb.collection("buyur_businesses").update(business.id, patch);
      console.log(`~ ${business.name} (${business.plan}): ${Object.keys(patch).join(", ")}`);
      updated += 1;
    }
  }

  console.log(updated === 0 ? "= plan kullanım alanları zaten güncel." : `~ ${updated} işletme güncellendi.`);
}

async function main() {
  await widenEventTypes();
  await addEventIndexes();
  await updatePlanLimits();
  await backfillTimezones();
  await backfillOccurredAt();
  await backfillPlanUsage();
  console.log("\nAnalitik göçü tamamlandı.");
}

main().catch((err) => {
  console.error("Hata:", err?.response ?? err);
  process.exit(1);
});
