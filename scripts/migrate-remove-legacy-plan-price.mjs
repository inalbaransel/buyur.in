// buyur_plans.price_6m / price_12m alanlarının kaldırılması göçü.
//
// Fiyatlandırma scripts/migrate-plan-pricing.mjs ile price_monthly /
// price_yearly_monthly ikilisine taşındı; price_6m/price_12m o zamandan beri
// kod tabanında hiçbir yerde okunmuyor/yazılmıyor, sadece canlı şemada
// (ve eski kayıtlarda) kalıntı olarak duruyordu. scripts/setup-pocketbase.mjs
// artık bu alanları tanımlamıyor; bu script var olan kurulumlardaki alanları
// koleksiyon şemasından siler.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-remove-legacy-plan-price.mjs
// Idempotent: alanlar zaten yoksa hiçbir şey yapmaz.

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const LEGACY_FIELDS = ["price_6m", "price_12m"];

const collection = await pb.collections.getOne("buyur_plans");
const toRemove = collection.fields.filter((f) => LEGACY_FIELDS.includes(f.name));

if (toRemove.length === 0) {
  console.log("= buyur_plans: price_6m/price_12m zaten yok.");
  process.exit(0);
}

const fields = collection.fields.filter((f) => !LEGACY_FIELDS.includes(f.name));
await pb.collections.update(collection.id, { fields });

console.log(`~ buyur_plans: kaldırıldı → ${toRemove.map((f) => f.name).join(", ")}`);
