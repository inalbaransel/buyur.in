// Destek ve bildirim modüllerinin kaldırılması göçü.
//
// Panel içi destek talebi ve duyuru zili üründen çıkarıldı; yükseltme talepleri
// artık WhatsApp üzerinden yürüyor (bkz. app/panel/(dashboard)/plan/page.tsx).
// Bu script var olan kurulumlardaki dört koleksiyonu siler:
//
//   buyur_ticket_messages, buyur_support_tickets,
//   buyur_notification_reads, buyur_notifications
//
// Silme sırası ÖNEMLİ: ilişkinin bağımlı tarafı (messages, reads) önce gider,
// yoksa PocketBase ilişki kısıtı yüzünden reddeder.
//
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-remove-support.mjs
// Idempotent: koleksiyon zaten yoksa atlanır.
//
// DİKKAT: Bu koleksiyonlardaki kayıtlar kalıcı olarak silinir. Geçmiş destek
// yazışmalarını saklamak istiyorsanız önce PocketBase'den dışa aktarın.

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const COLLECTIONS = [
  "buyur_ticket_messages",
  "buyur_support_tickets",
  "buyur_notification_reads",
  "buyur_notifications",
];

for (const name of COLLECTIONS) {
  let collection;
  try {
    collection = await pb.collections.getOne(name);
  } catch {
    console.log(`• ${name}: zaten yok, atlandı.`);
    continue;
  }

  await pb.collections.delete(collection.id);
  console.log(`• ${name}: silindi.`);
}

console.log("Destek/bildirim temizliği tamamlandı.");
