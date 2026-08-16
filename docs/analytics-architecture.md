# menuva Analitik & Raporlama Mimarisi

Bu doküman, panel içindeki Analiz Merkezi'nin veri mimarisini, event sözlüğünü,
API sözleşmesini ve plan bazlı yetkilendirmeyi tanımlar. Kod yazarken burası
referans alınır; şema/isim değişikliği burada da güncellenir.

## 1. Başlangıç durumu (bu iş öncesi)

| Katman | Durum |
|---|---|
| Event toplama | Menü tarayıcısı doğrudan PocketBase'e yazıyordu (`createRule: ""`) |
| Event modeli | `menuva_events` = business, type (4 değer), target, label, created |
| Sorgu | Panel son 30 günün **tüm ham event'lerini** tarayıcıya çekip sayıyordu |
| Yetki | Sadece frontend'de `limits.analytics` kontrolü |
| Eksikler | session, unique ziyaretçi, kaynak/UTM, cihaz, konum, QR ayrımı, funnel, agregasyon, saat dilimi |

## 2. Hedef mimari

```
Menü (tarayıcı)
   │  POST /api/track   (yalnızca ne olduğunu bildirir: type + hedef)
   ▼
Ingestion katmanı — app/api/track/route.ts
   │  session/visitor cookie · ilk-temas atfı (utm/qr/referrer) · cihaz · geo · sunucu saati · rate limit
   ▼
PocketBase (service hesabı ile yazar — istemci event yazamaz)
   ├── menuva_events      ham event akışı (retention'a tabi)
   └── menuva_sessions    oturum özeti (unique ziyaretçi, süre, bounce, yeni/dönen)
   ▼
Rollup — lib/analytics/rollup.ts  (cron veya okuma anında tembel)
   └── menuva_stats_daily  işletme saat dilimine göre gün × boyut × anahtar → metrikler
   ▼
Sorgu API — app/api/analytics/*  (token doğrulama · tenant izolasyonu · plan gating)
   ▼
Panel UI — /panel/analytics, /panel/reports (kendi SVG chart kit'imiz)
```

Temel kural: **işletme kimliği asla istemciden alınmaz.** Her analytics
isteğinde PocketBase auth token'ı sunucuda doğrulanır, işletme o kullanıcının
sahipliğinden/üyeliğinden türetilir.

## 3. Koleksiyonlar

### menuva_events (genişletildi)
| Alan | Tip | Not |
|---|---|---|
| business | relation | zorunlu, cascade |
| type | select | event sözlüğü (§4) |
| session | text(40) | oturum anahtarı |
| visitor | text(40) | birinci taraf rastgele kimlik — PII değil |
| target / label | text | serbest hedef (sayfa türü, arama terimi vb.) |
| product / category / popup / qr | relation | varsa ilişkili kayıt |
| source | text(40) | normalize: qr · instagram · google · direct · facebook · whatsapp · campaign · other |
| medium / campaign | text(60) | utm_medium / utm_campaign |
| referrer_host | text(120) | tam URL değil, yalnızca host |
| device | select | mobile · tablet · desktop |
| country / city | text | ISO-2 / şehir adı (yalnızca host geo header verirse) |
| locale | text(5) | menü dili |
| meta | json | event'e özgü küçük alanlar (ör. arama sonuç sayısı) |
| occurred_at | date | sunucu saati (backfill'e izin verir) |

İndeksler: `(business, occurred_at)`, `(business, type, occurred_at)`,
`(business, session)`, `(business, product, occurred_at)`.

### menuva_sessions
Oturum başına tek kayıt: `business, key(unique/business), visitor, started_at,
last_seen_at, duration_sec, events_count, page_views, product_views, cart_adds,
source, medium, campaign, device, country, city, locale, entry_path, exit_path,
qr, is_returning`.
Unique ziyaretçi, ortalama süre, bounce ve yeni/dönen oranı buradan gelir —
ham event taramadan.

### menuva_stats_daily
`business, date (YYYY-MM-DD, işletme saat diliminde), dimension, key, metrics(json)`
— unique `(business, date, dimension, key)`.
`dimension` değerleri: `total · hour · weekday · page · product · category ·
source · device · country · city · qr · campaign · search · funnel · navigation`.
Sorgular gün sayısı × boyut kadar kayıt okur; ham event'e yalnızca detay
analizlerde inilir.

### menuva_qr_codes
Etiketli QR'lar: `business, name ("Masa 01"), code (kısa kod, ?qr= ile taşınır),
placement (table·counter·window·instagram·campaign·other), is_active`.

### menuva_business_members
Ekip rolleri: `business, user, role (owner·admin·manager·staff), status
(active·invited), invited_email`. İzinler rolden türetilir (§6).

## 4. Event sözlüğü

| type | Ne zaman | İlişki |
|---|---|---|
| `page_view` | Her menü rota değişimi (geriye dönük uyumlu ad) | target = sayfa türü |
| `qr_scan` | Oturumun ilk isteği `?qr=` / `?src=qr` ile geldiyse | qr |
| `session_start` / `session_end` | Oturum açılış/kapanış (kapanış: beacon veya rollup'ta timeout) | — |
| `category_view` | Kategori sayfası | category |
| `product_view` | Ürün listede görüntülendi | product |
| `product_detail_view` | Ürün detay sayfası açıldı | product |
| `add_to_cart` / `remove_from_cart` | Sepet değişimi | product |
| `cart_view` | Sepet sayfası | — |
| `search` | Menü içi arama (debounce'lu) | meta: sonuç sayısı |
| `campaign_view` / `campaign_click` | Pop-up gösterimi / tıklaması | popup |
| `language_change` | Dil değişimi | meta: from/to |

## 5. Atıf (attribution) kuralları

- **Oturum:** `mv_sid` httpOnly cookie, 30 dk hareketsizlikte biter (kayan pencere).
- **Ziyaretçi:** `mv_vid` cookie (1 yıl), rastgele UUID — IP/UA parmak izi yok.
  `is_returning` = ziyaretçinin daha önce oturumu var mı.
- **Kaynak önceliği (ilk temas, oturum boyunca sabit):**
  `?qr=` / `?src=qr` → `utm_source` → referrer host eşlemesi (instagram/google/…) → `direct`.
- **QR ≠ menü görüntüleme:** QR taraması yalnızca oturumun ilk isteğinde ve
  `qr`/`src` parametresi varsa sayılır; sonraki sayfa görüntülemeleri tarama sayılmaz.
- **Saat dilimi:** `businesses.timezone` (varsayılan `Europe/Istanbul`). Günlük
  ve saatlik kırılımlar bu saat dilimine göre hesaplanır.

## 6. Plan bazlı yetki matrisi

**Tek kaynak: `lib/entitlements.ts`.** Panel, analytics API'si, otomatik web
sitesi, rapor üretimi ve pazarlama sitesi aynı matristen okur; plan kontrolü
başka hiçbir yerde elle yazılmaz.

| Yetenek | Freemium | Premium | Elite |
|---|---|---|---|
| Menü + temel analiz | ✓ | ✓ | ✓ |
| Gelişmiş analiz · içgörüler · kampanyalar | — | ✓ | ✓ |
| Otomatik web sitesi | — | ✓ | ✓ |
| Gelişmiş web sitesi (animasyon, slider, galeri) | — | — | ✓ |
| Gelişmiş raporlar + PDF/Excel/CSV | — | — | ✓ |
| Menü görüntülenme | 10.000 | sınırsız | sınırsız |
| Süre | 3 ay | sınırsız | sınırsız |
| Ham event saklama | 90 gün | 365 gün | 1095 gün |

**Freemium çift limiti:** 3 ay VEYA 10.000 menü görüntülenme — hangisi önce
dolarsa Freemium sona erer. Bu limitler ücretli planlara **uygulanmaz**.
Limit dolduğunda menü yayından kalkar ve gelişmiş özellikler kilitlenir; hiçbir
veri silinmez, plana geçildiğinde her şey kaldığı yerden devam eder.

Menü görüntülenmesi yalnızca gerçek müşteri sayfa görüntülemelerinden sayılır
(bot/crawler imzaları ve menü dışı event'ler sayaca girmez, bkz. `/api/track`).

## 7. API sözleşmesi

Tüm uçlar `GET`, `Authorization: Bearer <pb token>` ister ve aynı zarfı döner:

```jsonc
{
  "data": { /* uca özgü */ },
  "meta": {
    "range":      { "from": "2026-08-01", "to": "2026-08-15", "timezone": "Europe/Istanbul" },
    "comparison": { "from": "2026-07-17", "to": "2026-07-31", "mode": "previous_period" },
    "plan":       { "key": "premium", "advanced": true },
    "sampled":    false,       // veri yetersizse true
    "generatedAt": "2026-08-15T09:00:00.000Z"
  }
}
```

Uçlar: `overview · menu · products · products/:id · categories · categories/:id ·
sources · qr · activity · funnel · search · campaigns · insights · reports · reports/:id`.

Ortak sorgu parametreleri: `from`, `to`, `preset`, `compare`, `category`,
`product`, `source`, `device`, `campaign`. Her uç tarih aralığını, filtreleri ve
plan yetkisini doğrular; hata gövdesi iç detay sızdırmaz.

## 8. Performans

Analitikte gecikmenin kaynağı hesaplama değil, **sıralı PocketBase turlarıdır**
(her tur ~250ms). Tasarım kuralı: istek başına tur sayısını minimumda tut.

- Panel hiçbir zaman ham event listesi çekmez; okumalar `menuva_stats_daily` üzerinden.
- Rollup gün bazında idempotent: aynı gün tekrar hesaplanırsa üzerine yazar.
- **Veri olmayan günler de bir "toplam" satırı alır.** Aksi hâlde o gün
  "hesaplanmamış" görünür ve her istekte yeniden hesaplanır.
- **İşletmenin veri penceresi** (ilk/son event günü) önbellekte tutulur; bu
  pencerenin dışındaki günler hiç hesaplanmaz — "geçen yılın aynı dönemi" gibi
  boş aralıklar bedava.
- Bugünün bayat agregatı **arka planda** tazelenir; yanıt beklemez.
- Retention: ham event'ler plan retention süresi + 7 gün sonra silinir; agregatlar
  kalır. Bir günün ham verisi **ancak o gün agregata dönüştükten sonra** silinebilir.

### Önbellekler ve tazelik ödünleşimi

| Önbellek | Süre | Etkisi | Ödünleşim |
|---|---|---|---|
| Bağlam (kimlik + işletme + plan) | 60 sn | İstek başına 4 tur → 0 | Plan/rol değişikliği en geç 60 sn'de yansır |
| Tazelik kontrolü | 60 sn | Tekrarlı isteklerde rollup sorgusu yok | Yeni event en geç 60 sn'de agregata girer |
| Yanıt gövdesi (işletme+rol+uç+parametre) | 30 sn | Sekme değişimi ~2 ms | Veri en fazla 30 sn eski |
| Ürün/kategori adları | 5 dk | Etiket turu yok | Yeni ürün adı en geç 5 dk'da görünür |
| İşletme veri penceresi | 5 dk | Boş aralıklar bedava | — |

Yanıt önbelleği anahtarı işletme **ve rol** içerir: farklı yetkideki iki kullanıcı
asla aynı gövdeyi paylaşmaz.

### Ölçüm

`ANALYTICS_TIMING=1` ile her istek `auth=… data=… toplam=… pb_istek=N` olarak
loglanır; ayrıca her yanıtta `Server-Timing` başlığı ve önbellek durumu için
`X-Analytics-Cache: hit|miss` bulunur.

Ölçülen sonuç (Elite plan, son 30 gün + karşılaştırma, uzak PocketBase):

| Uç | Önce | Sonra | PB turu |
|---|---:|---:|---:|
| overview | 16,3 s | 0,34–0,52 s | 102 → 6 |
| insights | 14,2 s | 0,32–0,60 s | 95 → 4 |
| products | 13,5 s | 0,15–0,25 s | 92 → 2 |
| categories | 8,2 s | 0,15 s | 47 → 2 |
| sources / qr / activity / funnel | 6,3–8,4 s | 0,08–0,10 s | 46 → 1 |
| aynı istek (önbellek) | — | ~0,002 s | 0 |

Sayfa bazında: Trafik sayfası (4 uç) 0,33 s · Genel bakış (2 uç) 0,68 s.

## 9. Gizlilik

Toplanmayanlar: isim, e-posta, telefon, tam IP, tam referrer URL, kesin konum.
`visitor` kimliği rastgeledir ve kişiye bağlanamaz. Konum yalnızca ülke/şehir
seviyesinde ve host geo header sağlıyorsa tutulur. Rıza mekanizması geldiğinde
ingestion tek noktadan kapatılabilir (`/api/track`).

## 10. Fazlar

| # | Faz | Durum | Nerede |
|---|---|---|---|
| 1 | Event şeması v2 + sunucu taraflı ingestion | ✅ | `app/api/track`, `lib/analytics/{events,attribution,session,track-client}.ts` |
| 2 | Rollup / agregasyon | ✅ | `lib/analytics/{rollup,time,retention}.ts`, `app/api/analytics/rollup` |
| 3 | Analytics API + sunucu taraflı gating | ✅ | `app/api/analytics/[...path]`, `lib/analytics/{access,query,endpoints,range}.ts` |
| 4 | Panel UI: chart kit + Genel Bakış + filtreler | ✅ | `components/panel/charts/*`, `app/panel/(dashboard)/analytics` |
| 5 | Ürün & kategori analitiği + fırsat analizi | ✅ | `lib/analytics/opportunities.ts`, `analytics/products`, `analytics/categories` |
| 6 | Acquisition, QR yönetimi, aktivite, arama, kampanya | ✅ | `analytics/acquisition`, `analytics/activity`, `panel/qr` |
| 7 | Otomatik içgörüler + performans skoru | ✅ | `lib/analytics/{insights,score}.ts` |
| 8 | Elite Rapor Merkezi + export | ✅ | `lib/analytics/reports.ts`, `panel/reports` |
| 9 | Ekip rolleri ve izinler | ✅ | `panel/team`, `app/api/team/accept`, `lib/analytics/access.ts` |
| 10 | Testler | ✅ | `tests/*.test.ts` (60 test) |

### Dışa aktarma yaklaşımı

- **PDF:** rapor sayfasının kendisi çıktıdır; `@media print` kuralları panel
  kabuğunu gizler, tarayıcının "PDF olarak kaydet" akışı markalı belgeyi üretir.
  Ayrı bir PDF motoru/bağımlılığı yok.
- **CSV:** UTF-8 BOM + noktalı virgül ayırıcı ile üretilir; Excel'in Türkçe
  yerelinde sütunlar ve karakterler doğru açılır.
- **Native .xlsx üretilmiyor:** bunun için bir kütüphane (SheetJS/exceljs)
  eklemek gerekirdi; CSV yolu seçildi.

**Kapsam dışı (altyapı yok):** zamanlanmış rapor e-postaları (SMTP + zamanlayıcı
gerekir), ciro/sipariş metrikleri (sipariş modeli yok — sepet yereldir).

## 11. Bilinen sınırlar

- **Çapraz boyut filtresi yok.** Agregatlar boyut başına tutulduğu için
  "Instagram'dan gelenlerin Tatlılar performansı" gibi iki boyutu kesen sorgular
  şu anda desteklenmiyor. Kategori → ürün kırılımı ürün kayıtlarından çözülüyor;
  kaynak/cihaz filtresi ham event üzerinden çalışacak bir yol gerektirir.
- **Tekil ziyaretçi** aralık boyunca oturum kayıtlarından gerçek tekil olarak
  sayılır; oturum sayısı üst sınırı aşarsa günlük tekillerin toplamına düşülür ve
  yanıt `meta.approximate = true` ile işaretlenir.
- **Konum** yalnızca host geo header sağlıyorsa (Vercel/Cloudflare) dolar.
- **Ekip yönetimi** yazma tarafında işletme sahibiyle sınırlı (PocketBase kuralı
  böyle); "yönetici" rolü analitiği görür, ekibi değiştiremez.
