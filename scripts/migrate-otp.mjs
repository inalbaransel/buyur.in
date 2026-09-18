// Kayıt doğrulama (OTP) göçü. İki adım, bilerek ayrı:
//
//   1. (varsayılan) buyur_otps koleksiyonunu oluşturur — kayıt sırasında
//      gönderilen 6 haneli kodların sha256 özetleri burada durur. Bu adım
//      hiçbir mevcut akışı etkilemez, her an çalıştırılabilir.
//
//   2. (--lock-users) buyur_users.createRule'u servis hesabına kilitler. Kayıt
//      artık tarayıcıdan değil /api/auth/register üzerinden yapılır; kural açık
//      kalırsa doğrulama adımı doğrudan PocketBase'e yazılarak atlanabilir.
//
// Kullanım:
//   POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-otp.mjs
//   ... node scripts/migrate-otp.mjs --lock-users
//
// Idempotent: koleksiyon ve kural zaten doğruysa dokunmaz.
//
// SIRA ÖNEMLİ: 2. adım, YAYINDAKİ sürümün kayıt ekranını anında kırar (eski
// ekran doğrudan PocketBase'e yazar, 403 alır). Önce yeni sürümü dağıtın,
// sonra --lock-users ile kilitleyin.

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

const adminBypass = '@request.auth.collectionName = "buyur_admins"';

const OTP_SPEC = {
  name: "buyur_otps",
  type: "base",
  listRule: adminBypass,
  viewRule: adminBypass,
  createRule: adminBypass,
  updateRule: adminBypass,
  deleteRule: adminBypass,
  fields: [
    { name: "email", type: "email", required: true, exceptDomains: null, onlyDomains: null },
    { name: "code_hash", type: "text", required: true, min: 0, max: 64, pattern: "" },
    { name: "expires_at", type: "date", required: true },
    { name: "attempts", type: "number", min: 0, onlyInt: true },
    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
  ],
  indexes: ["CREATE INDEX `idx_otps_email` ON `buyur_otps` (`email`)"],
};

// 1) buyur_otps
let otps = null;
try {
  otps = await pb.collections.getOne(OTP_SPEC.name);
} catch (err) {
  if (err?.status !== 404) throw err;
}

if (!otps) {
  const created = await pb.collections.create(OTP_SPEC);
  console.log(`+ ${OTP_SPEC.name} oluşturuldu (id: ${created.id})`);
} else {
  const existingNames = new Set(otps.fields.map((f) => f.name));
  const missing = OTP_SPEC.fields.filter((f) => !existingNames.has(f.name));
  if (missing.length > 0) {
    await pb.collections.update(otps.id, { fields: [...otps.fields, ...missing] });
    console.log(`~ ${OTP_SPEC.name} alanları eklendi: ${missing.map((f) => f.name).join(", ")}`);
  } else {
    console.log(`= ${OTP_SPEC.name} zaten güncel.`);
  }
}

// 2) buyur_users.createRule — yalnızca --lock-users ile.
const users = await pb.collections.getOne("buyur_users");
const locked = (users.createRule ?? null) === adminBypass;

if (!process.argv.includes("--lock-users")) {
  console.log(
    locked
      ? "= buyur_users.createRule zaten kilitli."
      : "• buyur_users.createRule'a dokunulmadı. Yeni sürümü dağıttıktan sonra --lock-users ile çalıştırın."
  );
} else if (locked) {
  console.log("= buyur_users.createRule zaten servis hesabına kilitli.");
} else {
  await pb.collections.update(users.id, { createRule: adminBypass });
  console.log(`~ buyur_users.createRule güncellendi: ${users.createRule ?? "null"} → ${adminBypass}`);
}

console.log("\nOTP göçü tamamlandı.");
