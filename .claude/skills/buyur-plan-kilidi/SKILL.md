---
name: buyur-plan-kilidi
description: buyur'da bir özelliği abonelik planına bağlarken, limit eklerken veya fiyatlandırma tutarsızlığını giderirken izlenecek akış. Yeni bir özellik Premium/Elite'e kilitlenecekse, Freemium limiti değişecekse ya da landing fiyat tablosu ile panelde uygulanan kural ayrıştıysa kullanın.
---

# Özelliği Plana Bağlama

## Altın kural

`lib/entitlements.ts` **tek kaynaktır**. Panel, müşteri menüsü, analytics API'si,
rapor üretimi ve pazarlama sitesi hepsi buradan okur. Amaç: "landing'de yazan"
ile "panelde uygulanan" asla ayrışmasın.

`tests/entitlements.test.ts` bu kaynağın yazılı sözleşmesidir.
**Kural değişiyorsa önce test değişir.**

## Mevcut matris

| | Freemium | Premium | Elite |
|---|---|---|---|
| Süre | 3 ay | sınırsız | sınırsız |
| Menü görüntülenme | 10.000 | sınırsız | sınırsız |
| Ham veri saklama | 90 gün | — | — |

Yetenekler `Feature` union'ında: `menu`, `basic_analytics`,
`advanced_analytics`, `insights`, `campaigns`, `custom_domain`,
`branding_removal`, `custom_website`, `advanced_website`, `gifted_website`,
`advanced_reports`, `report_export`.

## Adımlar

### 1. Yeteneği tanımla

```ts
export type Feature =
  | "menu"
  // ...
  | "yeni_yetenek";
```

`NONE` sabitine `false` olarak ekle, sonra `PLAN_ENTITLEMENTS` içinde hangi
planların açtığını yaz. Bu iki yer birbirini tamamlar; birini unutmak tip
hatası verir — bu kasıtlıdır.

### 2. Uygulama noktasında kontrol et

```ts
import { isFeatureAvailable, requiredPlanFor, PLAN_LABELS } from "@/lib/entitlements";

if (!isFeatureAvailable(business.plan, "yeni_yetenek")) {
  const gerekli = requiredPlanFor("yeni_yetenek");
  // UpgradeNotice ile göster
}
```

**Yasak:** `if (business.plan === "premium")`, `if (plan !== "freemium")`,
bileşene gömülü `10000` veya `3` sayıları.

### 3. Kullanıcıya doğru göster

- Özelliği **gizleme** — kilitli ama görünür bırak, `UpgradeNotice` ile
  hangi planın açtığını söyle
- Freemium kullanım durumu için `freemiumUsage()` ve `TrialBanner`
- Yükseltme teşviki `lib/upsell.ts` / `lib/plan-intent.ts` üzerinden

### 4. Üç yüzeyi hizala

Bir yetki değişikliği **üç yerde birden** tutarlı olmalı:

1. Landing fiyat tablosu (`lib/pricing.ts`, `components/pricing*.tsx`)
2. Panel plan ekranı (`app/panel/(dashboard)/plan/page.tsx`)
3. Özelliğin fiilen uygulandığı yer

Üçünü de aç ve kontrol et.

### 5. Plan kayıtları

Sayısal kısıtlar `buyur_plans` koleksiyonunda da tutulur
(`lib/plan-limits.ts`). Değişiklik gerekiyorsa
`scripts/migrate-plan-pricing.mjs` / `scripts/plan-catalog.mjs` güncellenir.

## Dayanıklılık ilkesi

PocketBase'e ulaşılamazsa limitler **sınırsız** varsayılır
(`UNRESTRICTED_LIMITS`). Ödeme yapan bir işletme geçici bir ağ hatası yüzünden
panelini kullanamaz hâle gelmemeli. Yeni bir kısıt eklerken bu tarafı bozma.

## Kontrol listesi

- [ ] `Feature` union'ı ve `NONE` sabiti güncellendi
- [ ] `PLAN_ENTITLEMENTS` içinde her plan için karar verildi
- [ ] Uygulama noktasında `isFeatureAvailable()` kullanıldı, elle karşılaştırma yok
- [ ] Limit sayıları `entitlementsFor()` üzerinden okunuyor
- [ ] Kilitli durum `UpgradeNotice` ile görünür
- [ ] Landing / panel plan ekranı / uygulama noktası hizalı
- [ ] `tests/entitlements.test.ts` güncellendi (önce test)
- [ ] `bun run test` yeşil
