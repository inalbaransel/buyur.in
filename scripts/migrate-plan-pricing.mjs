// Fiyatlandırmayı 6/12 aylık paket mantığından aylık + yıllık modeline taşır ve
// Freemium'u 3 aylık denemeye çevirir:
//
//   Freemium  0₺           · 3 ay ücretsiz
//   Premium   ayda 250₺    · yıllık ödemede ayda 200₺ (2.400₺/yıl)
//   Elite     ayda 500₺    · yıllık ödemede ayda 400₺ (4.800₺/yıl)
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

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const PRICING = {
  freemium: { price_monthly: 0, price_yearly_monthly: 0, trial_months: 3 },
  premium: { price_monthly: 250, price_yearly_monthly: 200, trial_months: 0 },
  elite: { price_monthly: 500, price_yearly_monthly: 400, trial_months: 0 },
};

/** Süreli planların (şimdilik yalnızca Freemium) geçiş süresi. */
const TRIAL_MONTHS = PRICING.freemium.trial_months;

/** Ay ekler; karşılığı olmayan günlerde sonraki aya taşmak yerine hedef ayın
 *  son gününe sabitler (bkz. lib/plan-period.ts addMonths). */
function addMonths(date, months) {
  const result = new Date(date.getTime());
  const expectedMonth = (((result.getMonth() + months) % 12) + 12) % 12;
  result.setMonth(result.getMonth() + months);
  if (result.getMonth() !== expectedMonth) result.setDate(0);
  return result;
}

async function repricePlans() {
  const plans = await pb.collection("menuva_plans").getFullList();

  for (const plan of plans) {
    const pricing = PRICING[plan.key];
    if (!pricing) {
      console.log(`! plans/${plan.key} fiyat tablosunda yok, atlanıyor.`);
      continue;
    }

    const changed = Object.entries(pricing).filter(([field, value]) => plan[field] !== value);
    if (changed.length === 0) {
      console.log(`= plans/${plan.key} fiyatları zaten güncel.`);
      continue;
    }

    await pb.collection("menuva_plans").update(plan.id, pricing);
    console.log(
      `~ plans/${plan.key}: ${changed.map(([field, value]) => `${field} ${plan[field] ?? "—"} → ${value}`).join(", ")}`
    );
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
  await repricePlans();
  await backfillTrialExpiry();
  console.log("\nFiyat göçü tamamlandı.");
}

main().catch((err) => {
  console.error("Hata:", err?.response ?? err);
  process.exit(1);
});
