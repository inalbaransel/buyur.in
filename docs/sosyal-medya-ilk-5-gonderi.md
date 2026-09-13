# Sosyal medya — ilk 5 gönderi planı

> 2. hafta toplantısı aksiyonu: Instagram ve X hesaplarının açılması + ilk 5
> gönderinin planlanması. Hesapların açılması ekipte; bu doküman içerik planıdır.
>
> Kural (landing ile aynı): **uydurma rakam ve müşteri yorumu yok.** Gerçek veri
> yoksa "demo menü", "örnek panel" diye açıkça yazılır.

## Genel kurgu

- **Hedef kitle:** restoran, kafe, pastane ve otel sahipleri/işletmecileri.
- **Tek mesaj:** *Menünüzü güncel tutun, müşterinin seçimini kolaylaştırın.*
- **Sıklık:** ilk iki hafta haftada 3 gönderi (Pzt · Çar · Cum), sonra haftada 2.
- **Bio linki:** `https://menuvaapp.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio`
  (landing ilk ziyaretteki UTM'i saklar; kayıt olayına eklenir, GA4'te kampanya bazında görünür).
- **Her gönderinin linki** kendi `utm_campaign` değerini taşır: `launch_1` … `launch_5`.

## Gönderiler

### 1 · Karusel — "Basılı menünün çözemediği üç sorun"

- **Görsel:** 4 kare. (1) Başlık kartı · (2) Fiyat değişince yeniden baskı → anlık güncelleme ·
  (3) Yanlış/eksik sipariş → sepeti garsona göster · (4) Hangi ürün ilgi görüyor bilinmez → ürün ve QR analizi.
  Landing'deki "Neden menuva" bölümünün kartları birebir kullanılabilir.
- **Metin:** "Zam geldi, menüyü yeniden bastırmak zorunda mısınız? Üç sorun, üç sonuç — kaydırın."
- **CTA:** "Ücretsiz menünü oluştur — link bio'da." · `utm_campaign=launch_1`

### 2 · Reels (10–15 sn) — "Fiyatı değiştir, masada anında"

- **Çekim:** ekran kaydı. Solda panelde bir ürünün fiyatı değişir, "Kaydet"; sağda telefonda açık menüde
  fiyat yenilenmeden güncellenir. Müzik + tek satır alt yazı.
- **Metin:** "Matbaa yok, bekleme yok. Kaydet dediğiniz an bütün masalarda yeni fiyat."
- **CTA:** "5 dakikada kurulum, kredi kartı yok." · `utm_campaign=launch_2`

### 3 · Reels — "Sepet → garsona göster"

- **Çekim:** müşteri gözünden: QR'ı okut → ürüne bak → sepete ekle (seçenekle, ör. "büyük boy") →
  "Yanına içecek ister misin?" önerisi → sepet ekranını garsona göster.
- **Metin:** "Sipariş yine garsonunuzda; ama müşterinin seçimi artık ekranda eksiksiz."
- **Not:** menuva bugün sipariş/ödeme almıyor — "online sipariş" gibi bir ifade kullanılmaz.
- `utm_campaign=launch_3`

### 4 · Tekil gönderi — "Menünüzü gönderin, demo menünüzü hazırlayalım"

- **Görsel:** solda kâğıt menü fotoğrafı, sağda aynı menünün telefonda menuva hâli (demo işletme).
- **Metin:** "Menünüzün fotoğrafını WhatsApp'tan gönderin; sizin için demo menü hazırlayalım.
  Kendi QR'ınızla, kendi telefonunuzda görün."
- **CTA:** WhatsApp linki (landing'deki "Menümü gönder" mesajıyla aynı). · `utm_campaign=launch_4`

### 5 · Tekil gönderi / Story — "Telefonunla okut, canlı dene"

- **Görsel:** demo menünün QR kodu (landing hero'daki QR ile aynı hedef:
  `vezirhan.menuvaapp.com/?utm_source=instagram&utm_medium=social&utm_campaign=launch_5`) + telefon mockup.
- **Metin:** "Ekran görüntüsü değil, gerçek menü. Okutun, dil değiştirin (TR · EN · AR · RU), sepete ekleyin."
- **Etiket:** görselde "Demo menü" yazısı bulunur.

## X (Twitter) karşılıkları

Aynı beş konu, 1–3 tweet'lik kısa zincirler olarak: 1 → "üç sorun" zinciri, 2 → video + tek cümle,
3 → sepet akışı GIF'i, 4 → "menünü gönder" teklifi, 5 → QR görseli. Linkler `utm_source=x`.

## Ölçüm

Landing'de toplanan olaylar (Vercel Analytics + GA4): `cta_click`, `live_demo_open`,
`whatsapp_lead`, `pricing_viewed`, `plan_cta`, `signup_completed`. Her gönderinin getirdiği
kayıt, GA4'te `utm_campaign` kırılımıyla görülür.
