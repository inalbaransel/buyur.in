---
name: buyur-plan-kilidi
description: buyur'da bir özelliği abonelik planına bağlarken, limit/kota eklerken, fiyat ya da plan içeriği değişirken izlenecek akış. Plan kuralları canlı `buyur_plans` kaydından okunur; yeni bir kilitlenebilir özellik, Freemium limiti, AI kotası veya fiyat tutarsızlığı söz konusuysa kullanın.
---

# Özelliği Plana Bağlama

## Altın kural

**Kaynak `buyur_plans` koleksiyonudur** (admin panelinden değişir). `lib/entitlements.ts`
onu okuma kapısıdır; panel, müşteri menüsü, analytics API'si, raporlar, landing ve
yasal sayfalar hepsi oradan okur. Kodda plan kuralı/rakam **tutulmaz**.

Koddaki `DEFAULT_PLAN_ENTITLEMENTS` yalnızca **yedek**tir (kayıt okunamazsa ya da bir alan
eksikse). `tests/plan-catalog.test.ts` yedek ile tohum katalog
(`scripts/plan-catalog.mjs`) aynı kalsın diye kilitler. **Kural değişiyorsa önce test.**

## Veri nerede duruyor

| Ne | Nerede |
|---|---|
| Süre (ay, 0 = süresiz) | `buyur_plans.trial_months` |
| Fiyat | `price_monthly`, `price_yearly_monthly` |
| Yetenek bayrakları, `menu_views`, `analytics_retention_days`, AI kotası | `buyur_plans.limits` (JSON) — şema: `lib/types.ts → PlanLimits` |
| Pazarlama metinleri | `name`, `description`, `features` (metin listesi) |

`limits` anahtarları: `ai_menu_import`, `ai_pages_per_scan`, `ai_scans_per_month`,
`ai_translation`, `analytics`, `analytics_advanced`, `analytics_retention_days`,
`api_access`, `branding_removal`, `campaigns`, `insights`, `menu_views`, `reports`,
`reports_export`, `scheduled_reports`, `website`. `null` = sınırsız. Ürün/kategori/işletme
sayısı sınırı **yok** — anahtar olarak da bulunmaz.

## Kayıtlar koda nasıl gelir

`lib/plan-catalog-loader.ts → ensurePlanCatalog(pb)` kayıtları okur, süreç belleğinde
60 sn tutar; hata fırlatmaz (okunamazsa son bilinen/yedek geçerli kalır).

- **Sunucu giriş noktası** plan kuralı okuyacaksa önce `await ensurePlanCatalog(createServerPB())`
  çağırır (bugün: `[slug]/layout`, `site/[slug]`, `ai/guard`, `analytics/access`, landing, yasal sayfalar)
- **Panel**: `BusinessProvider` yükler ve sekmeye dönülünce tazeler
- Statik/ISR sayfalar (`/`, `/yasal/*`, `/site/*`) 60 sn'de bir yeniden üretilir; değişiklik
  en geç ~2 dk içinde görünür

## Adımlar

### 1. Yeteneği tanımla
`Feature` union'ı + `NONE` + `DEFAULT_PLAN_ENTITLEMENTS` + `FEATURE_LIMIT_KEYS`
(feature → `limits` anahtarı) + `PlanLimits` tipi + `scripts/plan-catalog.mjs` tohumu.
Birini unutmak tip hatası ya da test kırılması verir — kasıtlı.

### 2. Canlı kayıtları güncelle
`buyur_plans` kayıtlarının `limits` alanına anahtarı ekle (MCP `pb_update` ya da admin paneli).
Kod yedeği ile kayıt **aynı değerde** olmalı.

### 3. Uygulama noktasında kontrol et
```ts
import { isFeatureAvailable, requiredPlanFor, PLAN_LABELS } from "@/lib/entitlements";
if (!isFeatureAvailable(business, "yeni_yetenek")) { /* UpgradeNotice */ }
```
**Yasak:** `plan === "premium"`, gömülü `5000`/`1` gibi sayılar, `buyur_plans`'ı elle sorgulayıp
`limits.x` okumak. Metinde limit geçiyorsa `freemiumLimits()` / `featureMatrix()` kullan.

### 4. Kullanıcıya doğru göster
Özelliği **gizleme** — kilitli ama görünür, `UpgradeNotice` ile hangi planın açtığı söylenir.
Freemium kullanımı: `freemiumUsage()` + `TrialBanner`. Yükseltme: `lib/upsell.ts`.

### 5. Fiyat
`lib/pricing.ts → planPricing(plan)` kayıttan okur; ücretli planda kayıt yoksa **`null`** döner —
ekran rakam uydurmaz ("Bize yazın"). Kodda fiyat sabiti yok. Yasal fiyat tablosu
(`lib/legal.ts`) aynı kayıttan render anında kurulur; sabit yasal cümleler elle güncellenir.

## Dayanıklılık ilkesi

Altyapı hatasında **kısıtlama değil serbestlik**: okunamayan kayıt ödeme yapan işletmeyi
kilitlememeli. Bu yüzden yedek matris + son bilinen katalog geçerli kalır; yeni bir kısıt
eklerken bunu bozma.

## Kontrol listesi

- [ ] `Feature`, `NONE`, yedek matris, `FEATURE_LIMIT_KEYS`, `PlanLimits`, tohum katalog birlikte güncellendi
- [ ] Canlı `buyur_plans` kayıtları güncellendi ve yedekle aynı
- [ ] Uygulama noktasında `isFeatureAvailable()` / `featureMatrix()` — elle karşılaştırma yok
- [ ] Yeni sunucu giriş noktasında `ensurePlanCatalog` çağrıldı
- [ ] Kilitli durum `UpgradeNotice` ile görünür
- [ ] `tests/entitlements.test.ts` + `tests/plan-catalog.test.ts` güncellendi (önce test)
- [ ] `bun run test` ve `bun run build` yeşil
