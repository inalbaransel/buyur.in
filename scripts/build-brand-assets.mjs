/**
 * Marka görsellerini tek kaynaktan üretir.
 *
 * Kaynaklar (tasarımdan gelen orijinaller, elle değiştirilmez):
 *   public/assets/BUYUR_dark.png     — açık zemin logosu (siyah)
 *   public/assets/BUYUR_light.png    — koyu zemin logosu (krem)
 *   public/assets/BUYUR_favicon.png  — kare "B" ikonu
 *   public/assets/BUYUR_desktop.png  — footer arka planı (geniş)
 *   public/assets/BUYUR_mobile.png   — footer arka planı (dikey)
 *   public/assets/buyur_image.png    — paylaşım (OG/Twitter) görseli
 *
 * Çalıştırma:  node scripts/build-brand-assets.mjs
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "public/assets");
const OUT = SRC; // türevler kaynakların yanına yazılır (BUYUR_* = kaynak, kebab-case = üretilmiş)
const APP = join(ROOT, "app");
const PUB = join(ROOT, "public");

/** İkonun zemin siyahı — maskable ikon ve apple-icon bu renkle düzleştirilir. */
const ICON_BG = { r: 4, g: 4, b: 4, alpha: 1 };

/** Saydam kenar boşluklarını kırpıp verilen yüksekliğe indirir. */
async function trimmed(file, height) {
  const img = sharp(join(SRC, file));
  const { data, info } = await img.clone().raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return img
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize({ height, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true });
}

/** PNG gömülü ICO (Vista+). Birden çok boyutu tek dosyada taşır. */
function ico(pngs) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const dir = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dir.push(e);
  }
  return Buffer.concat([head, ...dir, ...pngs.map((p) => p.buf)]);
}

const log = async (path, p) => {
  const info = await p;
  console.log(`  ${path.replace(ROOT + "/", "")}  ${(info.size / 1024).toFixed(1)} KB  ${info.width}x${info.height}`);
};

// ── 1. Kelime logosu (navbar / footer / 404) ────────────────────────────────
// Orijinaller kare tuvalde bol boşlukla geliyor; kırpılmış hâli olmadan
// 32 piksellik bir alanda logo görünmeyecek kadar küçük kalıyor.
console.log("Kelime logosu");
for (const [src, name] of [["BUYUR_dark.png", "wordmark-dark"], ["BUYUR_light.png", "wordmark-light"]]) {
  const img = await trimmed(src, 200);
  await log(`${name}.png`, img.toFile(join(OUT, `${name}.png`)));
}

// ── 2. İkonlar (favicon, PWA, Apple) ────────────────────────────────────────
console.log("İkonlar");
const icon = (size) => sharp(join(SRC, "BUYUR_favicon.png")).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 });

await log("app/icon.png", icon(512).toFile(join(APP, "icon.png")));
await log("public/icon-192.png", icon(192).toFile(join(PUB, "icon-192.png")));
await log("public/icon-512.png", icon(512).toFile(join(PUB, "icon-512.png")));

// Apple: saydamlık desteklenmiyor, köşeleri iOS kendi maskeliyor.
await log("app/apple-icon.png", icon(180).flatten({ background: ICON_BG }).toFile(join(APP, "apple-icon.png")));

// Maskable: "B" harfi zaten güvenli alanın (merkez %80) içinde kalıyor, bu
// yüzden ikon tam tuvale yayılır; yuvarlatılmış köşeler siyah zemine karışır ve
// maskeyi Android kendi uygular.
await log(
  "public/icon-512-maskable.png",
  icon(512).flatten({ background: ICON_BG }).toFile(join(PUB, "icon-512-maskable.png"))
);

const icoBuf = ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await icon(size).toBuffer() }))));
await writeFile(join(APP, "favicon.ico"), icoBuf);
console.log(`  app/favicon.ico  ${(icoBuf.length / 1024).toFixed(1)} KB  16/32/48`);

// ── 3. Paylaşım görseli (OG + Twitter) ──────────────────────────────────────
// Tam 1200x630: WhatsApp ve Twitter bu orandan sapan görselleri kırpıyor.
console.log("Paylaşım görseli");
await log(
  "assets/og.jpg",
  sharp(join(SRC, "buyur_image.png"))
    .resize(1200, 630, { fit: "cover", position: "center" })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(join(OUT, "og.jpg"))
);

// ── 4. Footer arka planı ────────────────────────────────────────────────────
// <picture> ile sanat yönetimi: mobilde dikey, masaüstünde geniş kare alınır.
// Tarayıcı yalnızca eşleşen kaynağı indirir.
console.log("Footer arka planı");
const backgrounds = [
  ["BUYUR_desktop.png", "footer-desktop", 1440],
  ["BUYUR_mobile.png", "footer-mobile", 391],
];
for (const [src, name, width] of backgrounds) {
  const base = sharp(join(SRC, src)).resize({ width, withoutEnlargement: true });
  await log(`${name}.webp`, base.clone().webp({ quality: 72, effort: 6 }).toFile(join(OUT, `${name}.webp`)));
  await log(`${name}.jpg`, base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`)));
}

console.log("\nTamam.");
