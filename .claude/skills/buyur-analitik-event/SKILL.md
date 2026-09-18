---
name: buyur-analitik-event
description: buyur analitiğine yeni bir event, metrik veya rapor eklerken izlenecek uçtan uca akış — sözlük, ingestion, PocketBase select göçü, rollup, panel gösterimi ve sözleşme testi. Yeni analitik event'i, yeni metrik, huni analizi, rapor ya da analitikte tutarsız sayı söz konusuysa kullanın.
---

# Analitik Event / Metrik Ekleme

## Veri akışı

```
menü istemcisi → /api/track → buyur_events → rollup → buyur_stats_daily → panel
```

Bir event bu zincirin **her halkasında** tanımlı olmazsa sessizce düşer.

## 1. Sözlüğe ekle

`lib/analytics/events.ts` tek kaynaktır:

```ts
export const ANALYTICS_EVENT_TYPES = [
  // ...
  "yeni_event",
] as const;
```

Sunucunun kendi ürettiği bir event mi? `SERVER_ONLY_EVENTS` setine ekle —
istemciden gelirse reddedilsin. Şu an sunucu-only olanlar: `qr_scan`,
`session_start`, `session_end`.

## 2. PocketBase select alanını genişlet

> Bu adım atlanırsa event yazılmaz ve hata sessizdir.

`buyur_events.type` bir `select` alanıdır ve `getOrCreate` var olan bir alanın
seçenek listesini **güncellemez**. Göç scriptine adım ekle
(`scripts/migrate-analytics.mjs` deseni), idempotent tut.

## 3. İstemci tarafında tetikle

`lib/analytics/track-client.ts` üzerinden `/api/track`'e gönder. Kurallar:

- Oturum başına tekrarlanmaması gereken event'ler için (ör. `product_view`)
  tekilleştirme mantığını koru
- Analitik yazımı başarısız olursa **hata yutulur** — menü akışı asla bozulmaz
- Payload'a kişisel veri koyma

## 4. Sunucu tarafında doğrula

`app/api/track/route.ts`: `isAnalyticsEventType()` ve
`isClientEmittableEvent()` kontrolünden geçmeli. Bilinmeyen tip reddedilir.

## 5. Agregata taşı

`lib/analytics/rollup.ts` içinde günlük kırılıma dâhil et. Dikkat:

- Kırılımlar **işletmenin saat dilimine** göre hesaplanır (`business.timezone`),
  sunucunun yerel saatine göre değil
- Ham veri saklama süresi plana bağlıdır (`entitlementsFor` → `retentionDays`);
  sabit gün sayısı yazma

## 6. Panelde göster

- Sorgu: `lib/analytics/query.ts`
- Grafik: `components/panel/charts/**` — palet `palette.ts`'ten
- Durumlar: yükleniyor / veri yok / yetersiz veri (`components/panel/analytics/states.tsx`)
- Gelişmiş metrikler plana bağlıysa `advanced_analytics` / `insights` kontrolü

## 7. Sözleşme testi yaz

`tests/` altına ekle veya güncelle: `rollup`, `track-ingestion`,
`attribution`, `retention`, `qr-funnel`, `time-and-range`, `insights-and-score`.
Zamanı sabitle, sınır durumlarını test et.

## Tarihsel tuzaklar

| Tuzak | Açıklama |
|---|---|
| `page_view` | Menü içi **rota değişimi** demektir; tarihsel ad, yeniden adlandırılmadı |
| `product_view` vs `product_detail_view` | Faz 1 öncesi kayıtlarda `product_view` detay açılışıydı. Dönemler arası kıyasta bu kırılmayı kullanıcıya not düş |
| `business.menu_views` | Yalnızca **gerçek müşteri** sayfa görüntülemeleri. Freemium 10.000 limiti buna bakar; panel önizlemesi artırmamalı |

## Kontrol listesi

- [ ] Sözlüğe eklendi, gerekiyorsa `SERVER_ONLY_EVENTS`'e de
- [ ] PocketBase `select` göçü yazıldı ve idempotent
- [ ] İstemci tetikleyicisi var, hata yutuluyor, tekilleştirme doğru
- [ ] `/api/track` doğrulamasından geçiyor
- [ ] Rollup'a dâhil, saat dilimi işletmeden okunuyor
- [ ] Panelde gösterim + boş/yetersiz veri durumları
- [ ] Plana bağlı metrik `entitlements` üzerinden kilitli
- [ ] Sözleşme testi yazıldı, `bun run test` yeşil
