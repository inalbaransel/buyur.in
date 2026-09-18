// AI menü aktarımı göçü. Mevcut bir kurulumu AI kotası alanlarıyla tamamlar:
//
//   1) buyur_businesses'a ai_scans_used (number) ve ai_scans_period (text) ekler.
//   2) Plan kayıtlarındaki limits'e AI kota alanlarını yazar (ai_scans_per_month,
//      ai_pages_per_scan) — panelin plan ekranı ve landing tablosu bu değerleri
//      lib/entitlements.ts'ten okur, buradaki kopya yalnızca yönetim görünürlüğü
//      içindir.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-ai.mjs
// Önkoşul: scripts/setup-pocketbase.mjs bu sürümle bir kez çalıştırılmış olmalı
// (yeni alanlar oradan da geliyor; bu script var olan kurulumlar içindir).
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

// lib/entitlements.ts ile aynı değerler — tek kaynak orası, burası yansıma.
const AI_LIMITS = {
  freemium: { ai_scans_per_month: 2, ai_pages_per_scan: 5 },
  premium: { ai_scans_per_month: 5, ai_pages_per_scan: 5 },
  elite: { ai_scans_per_month: 10, ai_pages_per_scan: 5 },
};

async function addFields() {
  const collection = await pb.collections.getOne("buyur_businesses");
  const existing = new Set(collection.fields.map((f) => f.name));

  const additions = [];
  if (!existing.has("ai_scans_used")) {
    additions.push({ name: "ai_scans_used", type: "number", min: 0, onlyInt: true });
  }
  if (!existing.has("ai_scans_period")) {
    additions.push({ name: "ai_scans_period", type: "text", min: 0, max: 7, pattern: "" });
  }

  if (additions.length === 0) {
    console.log("• buyur_businesses: AI kota alanları zaten var, atlandı.");
    return;
  }

  await pb.collections.update(collection.id, { fields: [...collection.fields, ...additions] });
  console.log(`• buyur_businesses: ${additions.map((f) => f.name).join(", ")} eklendi.`);
}

async function updatePlanLimits() {
  let plans;
  try {
    plans = await pb.collection("buyur_plans").getFullList();
  } catch {
    console.log("• buyur_plans okunamadı (henüz seed edilmemiş olabilir), atlandı.");
    return;
  }

  for (const plan of plans) {
    const target = AI_LIMITS[plan.key];
    if (!target) continue;

    const limits = plan.limits ?? {};
    const alreadySet =
      limits.ai_scans_per_month === target.ai_scans_per_month &&
      limits.ai_pages_per_scan === target.ai_pages_per_scan;

    if (alreadySet) {
      console.log(`• ${plan.key}: AI limitleri güncel, atlandı.`);
      continue;
    }

    await pb.collection("buyur_plans").update(plan.id, { limits: { ...limits, ...target } });
    console.log(`• ${plan.key}: AI limitleri yazıldı.`);
  }
}

await addFields();
await updatePlanLimits();
console.log("AI göçü tamamlandı.");
