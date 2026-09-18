// Otomatik ürün görseli göçü. Mevcut bir kurulumu görsel kaynak/lisans
// künyesiyle tamamlar:
//
//   buyur_products'a image_source (json) ekler.
//
// Alan neden gerekli: otomatik bulunan görselin hangi platformdan, hangi
// lisansla geldiği ürünle birlikte saklanır. Telif denetimi bu alan olmadan
// yapılamaz.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-product-image-source.mjs
// Idempotent: alan zaten varsa atlanır. Mevcut ürünler dokunulmadan kalır
// (künyesi olmayan görsel = kullanıcının kendi yüklediği görsel).

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const collection = await pb.collections.getOne("buyur_products");
const existing = new Set(collection.fields.map((f) => f.name));

if (existing.has("image_source")) {
  console.log("• buyur_products: image_source zaten var, atlandı.");
} else {
  await pb.collections.update(collection.id, {
    fields: [...collection.fields, { name: "image_source", type: "json", maxSize: 4000 }],
  });
  console.log("• buyur_products: image_source eklendi.");
}

console.log("Görsel kaynağı göçü tamamlandı.");
