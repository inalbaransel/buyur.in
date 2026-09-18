# buyur — Proje Rehberi

> **buyur**, restoran/kafe işletmeleri için QR tabanlı dijital menü platformu.
> Üç yüzü var: **müşteri menüsü** (`buyur.in/isletme` veya `isletme.buyur.in`),
> **işletme paneli** (`/panel`) ve **pazarlama sitesi** (kök alan adı).

Bu dosya, kod yazmaya başlamadan önce bilinmesi gereken mimari kararları ve
kuralları içerir. Ayrıntılı iş akışları için `.claude/skills/` altındaki
skill'lere, alan uzmanlıkları için `.claude/agents/` altındaki agent'lara bakın.

---

## 1. Teknoloji Yığını

| Katman | Seçim |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Dil | TypeScript (strict) |
| Stil | Tailwind CSS v4 (`@theme` token'ları, `app/globals.css`) |
| Veritabanı | PocketBase (`buyur_*` koleksiyonları) |
| Dosya deposu | MinIO (S3 uyumlu) — `lib/minio.ts` |
| AI | OpenAI (yalnızca sunucu tarafında) |
| Test | Vitest (`tests/`) |
| Paket yöneticisi | **bun** (`bun.lock` kaynak; `pnpm-lock.yaml` eskidir) |

### Komutlar

```bash
bun run dev      # geliştirme sunucusu (port 3000)
bun run build    # üretim derlemesi
bun run test     # vitest run — PR öncesi zorunlu
bun run lint     # next lint
bun run brand    # marka görsellerini yeniden üret
```

> Geliştirme sunucusunu elle başlatmayın; ajanslar `preview_start` ile
> `.claude/launch.json` içindeki `dev` yapılandırmasını kullanır.

---

## 2. Mimari Haritası

```
app/
  [slug]/            → MÜŞTERİ MENÜSÜ (welcome, menu, categories, products, cart, search, review)
  panel/(auth)/      → giriş / kayıt
  panel/(dashboard)/ → İŞLETME PANELİ (client component'ler, pb ile doğrudan konuşur)
  site/[slug]/       → işletmeye otomatik üretilen tanıtım sitesi
  api/               → track, upload, ai/scan, analytics
  blog/, yasal/      → pazarlama & hukuki içerik
components/
  menu/              → müşteri menüsü bileşenleri (MenuProvider bağlamı)
  panel/             → panel UI kiti, formlar, grafikler
  site/              → otomatik site bölümleri
lib/
  analytics/         → event sözlüğü, ingestion, rollup, raporlar, insights
  entitlements.ts    → PLAN KURALLARININ TEK KAYNAĞI
  i18n.ts            → çoklu dil alan çözümleme (tField)
  types.ts           → tüm veri modelleri
scripts/             → PocketBase şema kurulumu, göçler, seed verileri
tests/               → Vitest — iş kurallarının yazılı sözleşmesi
```

### Çok kiracılı (multi-tenant) yönlendirme

`middleware.ts` host'a bakar:

- `isletme.buyur.in/...` → `/isletme/...` rewrite (`x-buyur-rewrite: subdomain` başlığı eklenir)
- `isletme.buyur.in/site` → `/site/isletme`
- `admin.buyur.in` → `/admin/*` (izole uygulama; `requireAdmin()` asıl kontrol)
- `panel.` / `app.` gibi **rezerve** subdomain'ler (`lib/slug.ts`) kök alana yönlendirilir
- Panel asla subdomain'de yaşamaz

Yeni bir üst düzey rota eklerken slug çakışmasını `RESERVED_SLUGS`'a ekleyerek önleyin.

---

## 3. Veri Katmanı Kuralları

**Koleksiyonlar** (hepsi `buyur_` önekli): `businesses`, `categories`, `products`,
`product_options`, `popups`, `users`, `admins`, `plans`, `events`, `sessions`,
`stats_daily`, `qr_codes`, `reviews`, `admin_logs`, `otps`.

Üç farklı PocketBase istemcisi vardır — **doğru olanı seçmek kritiktir**:

| İstemci | Nerede | Ne zaman |
|---|---|---|
| `pb` (`lib/pocketbase.ts`) | tarayıcı, panel client component'leri | kullanıcının kendi yetkisiyle okuma/yazma |
| `createServerPB()` | route handler / server component | her istek için taze istemci; `authStore` sızmasın |
| `getServicePB()` (`lib/pocketbase-server.ts`) | yalnızca sunucu | servis hesabı; event yazımı, agregasyon |

Kurallar:

1. **Filtreleri her zaman `pb.filter()` ile parametreli yazın.** String birleştirme yok.
2. Route handler'da kimlik: `Authorization` başlığı → `authRefresh()` → `business.owner === userId` sahiplik kontrolü. (`app/api/upload/route.ts` referans akıştır.)
3. Menü ziyaretçisi PocketBase'e **doğrudan yazmaz**; `buyur_events` yazımı `/api/track` üzerinden servis hesabıyla yapılır.
4. Şema değişikliği = `scripts/setup-pocketbase.mjs` güncellemesi + gerekiyorsa **idempotent** bir göç scripti. `getOrCreate` var olan alanın `select` seçeneklerini güncellemez — bunun için ayrı göç adımı gerekir.
5. Kayıt tarayıcıdan yapılmaz: `buyur_users.createRule` servis hesabına kilitlidir, hesap `/api/auth/register` üzerinden OTP doğrulandıktan sonra açılır (`buyur_otps` yalnızca kodun sha256 özetini tutar).
6. Altyapı hatasında **kısıtlama değil, serbestlik** varsayılır (`lib/plan-limits.ts`): ödeme yapan işletme geçici bir ağ hatası yüzünden panelini kaybetmemeli.

---

## 4. Plan ve Yetki Sistemi

`lib/entitlements.ts` tek kaynaktır. Panel, menü, analytics API'si, raporlar ve
landing sayfası hepsi buradan okur.

- Planlar: `freemium` → `premium` → `elite`
- Freemium sınırları: **3 ay**, **10.000 menü görüntülenmesi**, 90 gün ham veri saklama
- Ücretli planlarda süre/görüntülenme limiti **yoktur**
- Yetenekler `Feature` union'ında tanımlı; yeni kilitlenebilir özellik eklenince **tek yer burasıdır**

> Hiçbir yerde `if (plan === "premium")` yazmayın. `isFeatureAvailable()` /
> `entitlementsFor()` kullanın. `tests/entitlements.test.ts` bu sözleşmenin
> yazılı hâlidir; kural değişiyorsa önce test değişir.

---

## 5. Çoklu Dil

- Desteklenen diller: `tr`, `en`, `ar`, `ru` (`ar` RTL)
- Ana metin (`name`, `description`) işletmenin **ana dilinde** tutulur; diğer diller `translations` JSON alanından okunur
- Okuma her zaman `tField(entity, field, locale, baseLocale)` ile yapılır — çeviri yoksa ana dile düşer
- Çevrilebilir alanlar: `name`, `description`, `campaign_label`, `group_name`, `title`, `message`
- Ana dil değişince içerik `lib/language-rebase.ts` ile yeni baz dile taşınır

---

## 6. Analitik

- Event sözlüğü: `lib/analytics/events.ts` — **tek kaynak**
- `qr_scan`, `session_start`, `session_end` yalnızca sunucu üretir; istemciden gelirse reddedilir
- Akış: istemci → `/api/track` → `buyur_events` → `rollup` → `buyur_stats_daily`
- Sözlüğe event eklemek PocketBase `select` alanının da güncellenmesini gerektirir (`scripts/migrate-analytics.mjs`)
- Gecikmenin ana kaynağı hesaplama değil, **sıralı PocketBase turlarıdır** (~250ms/tur). `pbRequestCount()` ile ölçün, istekleri `Promise.all` ile paralelleştirin.

---

## 7. Tasarım Dili

Token'lar `app/globals.css` içindeki `@theme` bloğunda:

| Token | Anlam |
|---|---|
| `paper` `#fbf5ea` | sıcak kâğıt zemini |
| `crema` `#f4ead9` | kart zemini |
| `ink` `#231812` / `ink-soft` | espresso mürekkep (saf siyah değil) |
| `paprika` `#e8491f` / `paprika-deep` | marka turuncusu |
| `herb` `#3e7c4f` | onay / taze |
| `line` `#e0d3bf` | kenarlık |

- Yazı tipleri: `font-display` (Bricolage), `font-body` (Figtree), `font-mono` (JetBrains)
- İşletmenin kendi rengi `var(--brand)` üzerinden gelir; menü tarafında marka rengini sabit token'la ezmeyin
- Panel bileşenleri **her zaman** `components/panel/ui.tsx` kitinden gelir: `Button`, `AiButton`, `AiActionButton`, `Card`, `PageHeader`, `Input`, `Select`, `Switch`, `Tabs`, `EmptyState`, `UpgradeNotice`, `FormActions`, `SaveStatus`. Yeni buton/inputs elle yazılmaz.
- Ham renk kodu (`#fff`, `bg-[#...]`) yazmayın; token kullanın.

---

## 8. Panel Form Deseni

1. `useBusiness()` ile aktif işletme
2. `useDraft()` ile otomatik taslak — **yarım girilmiş veri canlı menüye yazılmaz**
3. `useToast()` ile geri bildirim, `useConfirm()` ile yıkıcı işlem onayı
4. `FormActions` + `SaveStatus` ile kaydetme durumu
5. Kayıt başarılıysa taslak temizlenir

---

## 9. Yazım ve Dil Kuralları

- **Kullanıcıya görünen tüm metinler Türkçe** (panel, menü, hata mesajları dâhil)
- Kod yorumları Türkçe; **neden** açıklanır, ne yapıldığı değil
- Değişken/fonksiyon adları İngilizce, camelCase
- Hata mesajları kullanıcı diliyle konuşur: "Giriş yapmalısınız." — yığın izi değil

---

## 10. Güvenlik Sınırları

- API anahtarları (`OPENAI_API_KEY`, `BREVO_API_KEY`, MinIO, servis hesabı) **asla** `NEXT_PUBLIC_` önekiyle tanımlanmaz
- AI çağrıları yalnızca route handler içinde
- Yükleme: 5MB sınırı, izinli MIME listesi, `kind` doğrulaması, sahiplik kontrolü
- AI ile üretilen içerik **varsayılan olarak taslaktır**; kullanıcı onayı olmadan yayına alınmaz
- Okunamayan/belirsiz veriyi AI'ya **tahmin ettirmeyin**; kullanıcıya işaretleyin

---

## 11. Değişiklik Yaparken

- Mevcut mimariyi kullanın; paralel yeni bir yapı kurmayın
- İş kuralı değiştiyse `tests/` altındaki ilgili sözleşme testini güncelleyin
- `bun run test` ve `bun run build` yeşil olmadan iş bitmiş sayılmaz
- Menü sayfası mobilde **2 saniyenin altında** açılmalı; trafiğin %95+'ı mobildir
