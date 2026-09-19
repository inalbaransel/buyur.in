---
name: buyur-musteri-menusu
description: buyur'un müşteri QR menüsünde (app/[slug]/**, components/menu/**) ekran eklerken ya da düzeltirken izlenecek akış — MenuProvider bağlamı, sunucuda veri yükleme, marka rengi/tema, sepet, analitik event ve mobil hız bütçesi. Menü sayfası, kategori/ürün/sepet/arama ekranı, karşılama, popup, dil seçici ya da "menü yavaş açılıyor" söz konusuysa kullanın. Panel ekranları için buyur-panel-sayfasi kullanılır.
---

# Müşteri Menüsü Ekranı

Menü, ürünün ziyaretçiye görünen tek yüzü ve trafiğin %95+'ı mobil. Buradaki her
karar hız ve marka tutarlılığı üzerinden verilir.

## 0. Pazarlıksız üç kural

1. **Ziyaretçi PocketBase'e doğrudan yazmaz.** Tek yazma kapısı `/api/track`.
2. **Menü ilk boyamada hazır gelir.** Veri `app/[slug]/layout.tsx` içinde sunucuda çekilir;
   ekran açıldıktan sonra ek istek atıp beklemek geri adımdır.
3. **Marka rengi sabit token'la ezilmez.** İşletmenin rengi `var(--brand)` ailesinden gelir.

## 1. Rota haritası

```
app/[slug]/layout.tsx       → işletme + kategori + ürün + popup yüklenir, MenuProvider sarar
app/[slug]/page.tsx         → /welcome'a yönlendirir
app/[slug]/welcome/         → karşılama
app/[slug]/menu/            → kategori ızgarası
app/[slug]/categories/[id]/ → kategori içi ürün listesi
app/[slug]/products/[id]/   → ürün detayı
app/[slug]/search/          → arama
app/[slug]/cart/            → sepet (funnel'ın son adımı)
app/[slug]/review/          → değerlendirme
```

Linkler **her zaman** `base` öneki ile kurulur: subdomain erişiminde `""`,
path erişiminde `/isletme`. Elle `/${slug}/...` yazmayın — subdomain'de kırılır.

## 2. Bağlam: `useMenu()`

Ekranlar veriyi kendileri çekmez, bağlamdan alır:

```tsx
"use client";
import { useMenu } from "@/components/menu/menu-provider";

export default function OrnekEkran() {
  const { business, base, categories, products, locale, t, tf, track, addProduct } = useMenu();
  // ...
}
```

| Alan | Ne için |
|---|---|
| `base` | link öneki (subdomain / path) |
| `t(key, vars)` | arayüz metni (sabit UI sözlüğü) |
| `tf(entity, field)` | **içerik** metni — çeviri yoksa ana dile düşer |
| `track(payload)` | analitik event; oturum/kaynak/cihaz sunucuda eklenir |
| `addProduct` / `updateQuantity` / `removeLine` | sepet |
| `locale`, `locales`, `setLocale` | dil |
| `imageByCategory`, `productCountByCategory` | hazır türetimler — yeniden hesaplamayın |

> İçerik metnini asla `entity.name` ile okumayın; `tf(entity, "name")` kullanın.
> Aksi hâlde Arapça menüde Türkçe ad görünür (bkz. `buyur-cok-dilli-icerik`).

## 3. Veri eklemek gerekiyorsa

Yeni bir koleksiyon okumanız gerekiyorsa **layout'taki `Promise.all` bloğuna ekleyin**,
ekranın içinde `useEffect` ile çekmeyin. Sıralı PocketBase turu ~250ms'tir; mobilde
iki ek tur menü açılışını gözle görülür yavaşlatır.

- Filtreler `pb.filter()` ile parametreli
- Yalnızca yayındaki kayıtlar: `is_active = true` / `is_available = true`
- `sort: "order,created"`, `requestKey: null` (paralel isteklerde iptal olmasın)

## 4. Tema ve renk

Ekranda ham renk kodu yoktur. Kullanılabilir değişkenler:

| Değişken | Anlam |
|---|---|
| `var(--brand)` | işletmenin markası (zemin) |
| `var(--brand-on)` | marka zemini üzerindeki okunur metin |
| `var(--brand-text)` | kâğıt zemin üzerinde okunur marka tonu (vurgu metni) |

`--brand-text`, kontrast eşiği tutmayan markalarda otomatik koyulaştırılır
(`readableAccent`) — bu yüzden vurgu metninde doğrudan `--brand` kullanmayın.
Yüzey, tema ve yazı tipi işletme ayarından gelir (`lib/surfaces.ts`, `lib/themes.ts`,
`lib/fonts.ts`); panelin verdiği seçeneğin dışına çıkmayın.

Görsel yoksa kırık ikon değil, markanın tonunda doku gösterilir (`PlaceholderArt` deseni).

## 5. Analitik

`page_view` ve `cart_view` otomatik kaydedilir (`TrackPageViews`) — elle tekrar yazmayın.
Ekrana özel etkileşim eklerken:

```tsx
track({ type: "add_to_cart", productId: product.id, label: tf(product, "name"), locale });
```

- `qr_scan`, `session_start`, `session_end` **istemciden gönderilemez** — sunucu üretir
- Yeni bir event tipi gerekiyorsa `buyur-analitik-event` skill'i (sözlük + PocketBase select göçü)
- Oturum başına tekil sayılması gereken event için `trackOnce`

## 6. Mobil hız bütçesi

Menü mobilde **2 saniyenin altında** açılmalı.

- Görseller `FadeImg` ile — yükleme sırasında zıplama olmasın
- İlk ekranda olmayan ağır bileşenler (sepet çekmecesi, popup, dil modali) koşullu render edilir
- `useMemo` ile türetilen listeler; her render'da filtreleme/sıralama yok
- Yeni bağımlılık eklemeden önce paket boyutunu tartın

## 7. Ek durumlar — atlanmaması gerekenler

| Durum | Beklenen |
|---|---|
| Abonelik pasif / Freemium limiti dolmuş | `MenuUnavailable` — veri silinmez, plana geçince geri gelir |
| İşletme bulunamadı / pasif | `notFound()` |
| Kategori boş | boş liste değil, açıklayıcı boş durum |
| Arapça (RTL) | yön, hizalama ve ok ikonları çevrilir (`isRTLLocale`) |
| Görsel yok | `PlaceholderArt` |

## 8. Bitmeden önce

- [ ] `tf()` ile okunan her içerik alanı, `t()` ile her arayüz metni
- [ ] Linkler `base` önekli
- [ ] Ham renk kodu ve sabit token ile ezilmiş marka rengi yok
- [ ] Yeni okuma layout'taki `Promise.all` içinde
- [ ] `bun run test` + `bun run build` yeşil
- [ ] Mobil genişlikte (375px) ve RTL'de göz kontrolü

Yayın turu: [`buyur-yayin-oncesi`](../buyur-yayin-oncesi/SKILL.md)
