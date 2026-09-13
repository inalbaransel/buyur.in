# menuva

Restoranlar ve kafeler için dijital QR menü platformu.

## Çalıştırma

```bash
npm install
npm run dev
```

http://localhost:3000 adresinde açılır. (`.env.local` zaten hazır — Pocketbase ve MinIO bilgileri içinde.)

## İlk kullanım

1. http://localhost:3000/panel/kayit → hesap aç
2. İşletme adını yaz → menü adresin (slug) otomatik oluşur
3. **Kategoriler** → ör. "Kahvaltı", "Ana Yemekler" ekle
4. **Ürünler** → ürün ekle: fiyat, görsel, rozet, alerjen, hazırlanma süresi, varyant (Boy/Ekstra)
5. **QR & paylaş** → QR kodunu PNG indir, masalara bas
6. Menün `localhost:3000/<slug>` adresinde yayında — panelde yaptığın değişiklik açık menüde anında görünür (realtime)

## Yapı

- `app/page.tsx` — landing page
- `app/panel/*` — işletme sahibi yönetim paneli (giriş/kayıt, kategoriler, ürünler, kampanyalar, QR, ayarlar)
- `app/[slug]/page.tsx` — müşteri menü sayfası (SSR + SEO + sepet + realtime)
- `app/api/upload/route.ts` — görsel yükleme (MinIO'ya yazar, sahiplik kontrolü yapar)
- `lib/` — pocketbase istemcisi, minio istemcisi, tipler, sepet, slug, etiketler
- `scripts/setup-pocketbase.mjs` — Pocketbase koleksiyon şemasını kurar (idempotent, kuruldu)

## Altyapı

| Servis | Adres | Ne tutuyor |
|---|---|---|
| Pocketbase | `service.api.harbidigital.com` | users, businesses, categories, products, product_options, popups |
| MinIO | `s3.harbidigital.com/menuva` | ürün/logo/kapak/pop-up görselleri (kayıtta sadece URL tutulur) |

## Ortam değişkenleri

`.env.local` (git'e girmez):

- `NEXT_PUBLIC_PB_URL` — Pocketbase adresi
- `MINIO_ENDPOINT`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_PUBLIC_URL`
- `PB_SERVICE_EMAIL`, `PB_SERVICE_PASSWORD` — analitik servis hesabı (yalnızca sunucu tarafı;
  `node scripts/create-service-account.mjs` üretir). Tanımlı değilse `/api/track` sessizce
  devre dışı kalır, menü çalışmaya devam eder.
- `ANALYTICS_CRON_SECRET` — toplu rollup ucunu koruyan gizli anahtar (aşağıya bkz.)
- `ANALYTICS_TIMING=1` — (opsiyonel) analiz uçlarının faz sürelerini ve PocketBase
  tur sayısını loglar; performans incelerken açılır.

## Analitik

Menü event'leri tarayıcıdan doğrudan Pocketbase'e değil, `/api/track` üzerinden
toplanır: oturum, trafik kaynağı, cihaz ve konum sunucuda üretilir. Şema, event
sözlüğü, plan bazlı yetki matrisi ve API sözleşmesi için:
[`docs/analytics-architecture.md`](docs/analytics-architecture.md).

Kurulum sırası (mevcut bir ortamda):

```bash
node scripts/setup-pocketbase.mjs        # yeni koleksiyonlar/alanlar
node scripts/migrate-analytics.mjs       # event sözlüğü, indeksler, plan yetkileri
node scripts/create-service-account.mjs  # PB_SERVICE_* bilgilerini üretir
```

Agregasyon panel açıldığında tembel olarak çalışır; hiç ziyaret edilmeyen
panellerin de güncel kalması ve saklama süresi dolan ham verinin temizlenmesi
için günde bir kez şu uç tetiklenmeli:

```bash
curl -H "x-analytics-secret: $ANALYTICS_CRON_SECRET" https://<domain>/api/analytics/rollup
```

### Demo veri

Panelin dolu görünmesi gereken durumlar (demo, sunum, ekran görüntüsü) için
gerçek menüye bağlı, işaretli demo verisi üretilebilir:

```bash
node scripts/seed-analytics-demo.mjs --slug=vezirhan --months=6 --dry  # önce hacmi gör
node scripts/seed-analytics-demo.mjs --slug=vezirhan --months=6        # yaz
node scripts/seed-analytics-demo.mjs --slug=vezirhan --clean           # geri al
```

Üretilen kayıtlar işaretlidir (oturum/ziyaretçi kimliği `5eed5eed…`, event'lerde
`meta.seed = true`), böylece gerçek veriye dokunmadan temizlenebilir. Yazdıktan
sonra rollup çalıştırılmalı.

## Testler

```bash
npm test        # vitest (agregasyon, atıf, tarih/saat dilimi, tenant izolasyonu, gating)
```

## 2. hafta değişikliklerini canlıya alma

Kod tarafı hazır; canlı PocketBase'de bir kez çalıştırılması gerekenler:

```bash
# 1) Yeni alan + koleksiyon: menuva_businesses.activation (aktivasyon metriği)
#    ve menuva_blog_posts (blog). İdempotent.
POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/setup-pocketbase.mjs

# 2) Canlı paket kayıtlarını katalogla hizala: eski "Maksimum 30 ürün",
#    "Temel sipariş yönetimi", "API erişimi" metinleri ve 250/200 · 500/400 fiyatları
#    burada düzelir. (Landing zaten katalogdan okuyor; bu adım panel/limitler için.)
POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/migrate-plan-pricing.mjs

# 3) QR hunisi metriklerini (menü açılışı → ürün → sepet) geçmiş günler için üret.
curl -H "x-analytics-secret: $ANALYTICS_CRON_SECRET" "https://<domain>/api/analytics/rollup?days=60"
```

**Blog:** yazılar PocketBase yönetim ekranında `menuva_blog_posts` koleksiyonuna
girilir (`slug`, `title`, `excerpt`, `content` editör alanı, `cover_url`, `tags`,
`is_published`, `published_at`). Yayınlananlar `/blog` altında 5 dakika içinde görünür
ve sitemap'e eklenir.

**Sosyal kanıt:** landing'deki canlı menü kartları `lib/showcase.ts`'ten gelir. Gerçek
bir müşteri onay verdiğinde oraya eklenir (`kind: "customer"`, istenirse gerçek yorum).

## Sıradaki adımlar

- [ ] Canlıya alma (Coolify/Vercel) + `menuvaapp.com` domain'i
- [ ] Online ödeme (iyzico/PayTR) — "Premium'u başlat" bugün panel içi geçiş talebi açıyor
- [ ] Gerçek müşteri logoları/yorumları (landing sosyal kanıt katmanı hazır)
- [ ] Panelin gerçek ekran görüntüleri (landing'deki panel vitrini şimdilik kodla çizilmiş kopya)