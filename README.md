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

## Sıradaki adımlar

- [ ] Canlıya alma (Coolify/Vercel) + `menuvaapp.com` domain'i
- [ ] Drag & drop sıralama (şimdilik ▲▼ ok butonları var)
- [ ] Analitik paneli (görüntülenme, QR tarama sayısı)
- [ ] Çoklu dil desteği (TR/EN/AR/RU)
xx