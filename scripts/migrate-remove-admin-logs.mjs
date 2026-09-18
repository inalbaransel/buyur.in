// buyur_admin_logs koleksiyonunun kaldırılması göçü.
//
// Koleksiyon şemada tanımlıydı ama hiçbir route handler'da yazılmıyor, hiçbir
// admin ekranında okunmuyordu (loglama hiç uygulanmamış, boş kalmış bir
// altyapıydı). scripts/setup-pocketbase.mjs artık bu koleksiyonu tanımlamıyor;
// bu script var olan kurulumlardaki koleksiyonu siler.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-remove-admin-logs.mjs
// Idempotent: koleksiyon zaten yoksa atlanır.
//
// DİKKAT: Koleksiyondaki kayıtlar kalıcı olarak silinir (canlıda 0 kayıt).

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const NAME = "buyur_admin_logs";

let collection;
try {
  collection = await pb.collections.getOne(NAME);
} catch {
  console.log(`• ${NAME}: zaten yok, atlandı.`);
  process.exit(0);
}

await pb.collections.delete(collection.id);
console.log(`• ${NAME}: silindi.`);
