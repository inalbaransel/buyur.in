---
name: buyur-cok-dilli-icerik
description: buyur'da çevrilebilir bir içerik alanı eklerken, yeni dil desteği verirken, ana dil değişimi/çeviri düşme davranışını düzeltirken veya RTL (Arapça) düzenini kontrol ederken izlenecek akış. Çeviri, dil seçimi, translations alanı, tField veya hreflang söz konusuysa kullanın.
---

# Çok Dilli İçerik

## Model

- Diller: `tr`, `en`, `ar`, `ru` — `ar` **RTL**
- Ana metin (`name`, `description`) işletmenin **ana dilinde** tutulur
  (`business.main_language`, boşsa `tr`)
- Diğer diller `translations` JSON alanından okunur
- Çeviri yoksa veya boş string ise **ana dile düşer**

```ts
export type Translations = Partial<Record<Locale, Partial<Record<TranslatableField, string>>>>;
```

Çevrilebilir alanlar: `name`, `description`, `campaign_label` (ürün),
`group_name` (ürün seçeneği), `title` / `message` (popup).

## Okuma — tek doğru yol

```ts
import { tField } from "@/lib/i18n";

const ad = tField(kategori, "name", locale, business.main_language ?? "tr");
```

Menü bileşenlerinde `useMenu()` bağlamındaki kısayolu kullan:

```tsx
const { tf } = useMenu();
<h2>{tf(product, "name")}</h2>
```

**Yasak:** `product.name` doğrudan yazdırmak. Bu, çevirisi olan bir menüde
kullanıcının seçtiği dili sessizce yok sayar.

## Yeni çevrilebilir alan ekleme

1. `TranslatableField` union'ına ekle (`lib/i18n.ts`)
2. `lib/types.ts` içinde varlığın `Translatable` sözleşmesini sağladığından emin ol
3. Panelde `MultiLangFields` ile düzenlenebilir yap
4. Menü tarafında okumayı `tf(...)` ile yap
5. `lib/language-rebase.ts` içindeki taşıma mantığının yeni alanı da taşıdığını doğrula
6. `tests/language-rebase.test.ts` güncelle
7. Gerekiyorsa `scripts/seed-translations.mjs`

## Ana dil değişimi

İşletme ana dilini değiştirince mevcut ana metinler eski dile ait çeviri
olarak saklanır ve yeni baz dilin çevirisi ana alana taşınır
(`lib/language-rebase.ts`). Bu davranışı elle tekrar yazma — mevcut yardımcıyı
kullan. Sözleşme: `tests/language-rebase.test.ts`.

## Geriye uyum

`main_language` ve `languages` alanlarının **ikisi de tanımsızsa** (eski kayıt)
tüm diller aktif sayılır. Yeni kod yazarken bu varsayımı koru; eski
işletmelerin dil seçicisi bir gecede kaybolmamalı.

## RTL

```ts
import { isRTLLocale } from "@/lib/i18n";
```

Arapça seçiliyken kontrol edilecekler: metin yönü, hizalama, ikon yönü, kaydırma
ve kenar boşlukları. `dir` kararını bileşene gömme — `isRTLLocale` tek karar
noktasıdır.

## AI ile çeviri üretimi

- Çeviriler **kullanıcı onayına** sunulur, doğrudan yayına alınmaz
- Fiyat, sayı, para birimi ve doğrulanması gereken bilgiler **değiştirilmez**
- Kullanıcı dilleri tek tek seçebilmeli veya tüm aktif diller için üretebilmeli
- Ayrıntı: `buyur-ai-akisi` skill'i

## SEO tarafı

- Dil alternatifleri `hreflang` ile bildirilir
- Subdomain menüsü ile kök alan yolu **aynı içeriği iki URL'de** sunmamalı —
  canonical'a dikkat
- Metadata üretimi `lib/seo.ts` üzerinden; sayfa dosyasında elle `<meta>` yazma

## Kontrol listesi

- [ ] Yeni alan `TranslatableField` union'ında
- [ ] Panelde `MultiLangFields` ile düzenlenebilir
- [ ] Menüde okuma `tf` / `tField` ile, ham alan yazdırılmıyor
- [ ] Çeviri boşsa ana dile düşüyor
- [ ] `language-rebase` yeni alanı taşıyor + testi güncel
- [ ] Arapça'da düzen bozulmuyor
- [ ] Eski kayıtlarda (dil alanları tanımsız) davranış korunuyor
- [ ] `bun run test` yeşil
