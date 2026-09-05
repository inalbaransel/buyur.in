// Paket kararlarını (fiyat, süre, özellik listesi, limitler) canlı
// `menuva_plans` kayıtlarına yazar. Tek doğruluk kaynağı
// scripts/plan-catalog.mjs — burada rakam/metin elle yazılmaz.
//
//   Freemium  0₺        · 3 ay veya 10.000 görüntülenme · ÜRÜN LİMİTİ YOK
//   Premium   ayda 249₺ · yıllık ödemede ayda 199,20₺ (2.390,40₺/yıl)
//   Elite     ayda 749₺ · yıllık ödemede ayda 599,20₺ (7.190,40₺/yıl)
//
// scripts/migrate-plans.mjs var olan bir plan kaydına bilinçli olarak dokunmaz
// (ilk seed'dir); paket tanımı değiştiğinde canlıyı hizalayan yer BURASIDIR.
//
// Ayrıca süresi tanımsız kalmış mevcut Freemium işletmelerine bir bitiş tarihi
// yazar. Bu tarih işletmenin kayıt anına değil, script'in çalıştığı ana +3 ay
// olacak şekilde hesaplanır: eski kullanıcıları geriye dönük "süresi dolmuş"
// duruma düşürmek yerine herkese eşit bir geçiş süresi tanıyoruz.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-plan-pricing.mjs
// Önkoşul: scripts/setup-pocketbase.mjs yeni alanları (price_monthly,
// price_yearly_monthly, trial_months, businesses.plan_expires_at) eklemiş olsun.
// Idempotent: değerler zaten yerindeyse hiçbir kayda dokunmaz.

import PocketBase from "pocketbase";
import { PLAN_SEEDS } from "./plan-catalog.mjs";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

/** Katalogdan canlıya yazılan alanlar. `is_active`, `is_default` ve `order`
 *  bilinçli olarak dışarıda: onlar operasyonel kararlar, admin panelinden
 *  yönetiliyor. */
const SYNCED_FIELDS = [
  "name",
  "description",
  "price_monthly",
  "price_yearly_monthly",
  "trial_months",
  "features",
];

/** Süreli planların (şimdilik yalnızca Freemium) geçiş süresi. */
const TRIAL_MONTHS = PLAN_SEEDS.find((plan) => plan.key === "freemium")?.trial_months ?? 3;

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

/** Ay ekler; karşılığı olmayan günlerde sonraki aya taşmak yerine hedef ayın
 *  son gününe sabitler (bkz. lib/plan-period.ts addMonths). */
function addMonths(date, months) {
  const result = new Date(date.getTime());
  const expectedMonth = (((result.getMonth() + months) % 12) + 12) % 12;
  result.setMonth(result.getMonth() + months);
  if (result.getMonth() !== expectedMonth) result.setDate(0);
  return result;
}

async function syncPlans() {
  const plans = await pb.collection("menuva_plans").getFullList();

  for (const plan of plans) {
    const spec = PLAN_SEEDS.find((seed) => seed.key === plan.key);
    if (!spec) {
      console.log(`! plans/${plan.key} katalogda yok, atlanıyor.`);
      continue;
    }

    const changed = SYNCED_FIELDS.filter((field) => !sameValue(plan[field], spec[field])).map((field) => [
      field,
      spec[field],
    ]);

    // Limitler iç içe bir nesne; yalnızca farklı olan alanları yamalıyoruz ki
    // admin panelinden elle girilmiş, katalogda karşılığı olmayan limitler
    // (ör. yeni bir analitik bayrağı) ezilmesin.
    const limits = plan.limits ?? {};
    const limitPatch = Object.entries(spec.limits).filter(([field, value]) => !sameValue(limits[field], value));

    if (changed.length === 0 && limitPatch.length === 0) {
      console.log(`= plans/${plan.key} zaten güncel.`);
      continue;
    }

    const payload = Object.fromEntries(changed);
    if (limitPatch.length > 0) payload.limits = { ...limits, ...Object.fromEntries(limitPatch) };

    await pb.collection("menuva_plans").update(plan.id, payload);

    const describe = ([field, value]) => `${field} → ${Array.isArray(value) ? `${value.length} madde` : value ?? "sınırsız"}`;
    console.log(`~ plans/${plan.key}: ${[...changed, ...limitPatch].map(describe).join(", ")}`);
  }
}

async function backfillTrialExpiry() {
  // Süreli plandaki (ücretsiz) işletmelerden bitiş tarihi boş olanlar.
  const businesses = await pb.collection("menuva_businesses").getFullList({
    filter: pb.filter("plan = {:plan} && plan_expires_at = ''", { plan: "freemium" }),
  });

  if (businesses.length === 0) {
    console.log("= süresi yazılmamış Freemium işletme yok.");
    return;
  }

  const expiresAt = addMonths(new Date(), TRIAL_MONTHS).toISOString();
  for (const business of businesses) {
    await pb.collection("menuva_businesses").update(business.id, { plan_expires_at: expiresAt });
  }
  console.log(`~ ${businesses.length} Freemium işletmeye deneme bitişi yazıldı: ${expiresAt}`);
}

async function main() {
  await syncPlans();
  await backfillTrialExpiry();
  console.log("\nPaket göçü tamamlandı.");
}

main().catch((err) => {
  console.error("Hata:", err?.response ?? err);
  process.exit(1);
});
