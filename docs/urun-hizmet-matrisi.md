# menuva — Ürün / Hizmet Matrisi ve Paket Ağacı

> Bu doküman satış, pazarlama ve ürün tarafının **ortak referansıdır**. Pakette
> ne olduğu tartışılırken bakılacak tek yer burasıdır.
>
> Kodda karşılığı olan kararlar üç dosyada yaşar ve birbirinden ayrışamaz:
> yetki matrisi [`lib/entitlements.ts`](../lib/entitlements.ts), ilan edilen
> fiyat [`lib/pricing.ts`](../lib/pricing.ts), veritabanına yazılan paket tanımı
> [`scripts/plan-catalog.mjs`](../scripts/plan-catalog.mjs). Landing sayfası ve
> panel aynı matristen okur; "sitede yazan" ile "panelde uygulanan" farklı olamaz.
>
> Son güncelleme: 5 Eylül 2026

---

## 1. menuva nedir?

menuva, restoran ve kafeler için **dijital menü ve müşteri deneyimi
platformudur**. Üç işi bir arada yapar:

1. **Menüyü dijitalleştirir.** QR kodla açılan, telefonda hızlı çalışan, fiyatı
   ve içeriği anında güncellenebilen bir menü.
2. **İşletmeye kendi web varlığını verir.** Menü verisinden otomatik oluşan,
   kendi alan adında yayınlanabilen bir restoran web sitesi.
3. **Menüyü ölçülebilir hâle getirir.** Hangi ürün kaç kez incelendi, müşteri
   menüde ne kadar kaldı, trafik nereden geldi — tahmin yerine veri.

**Tek cümleyle:** basılı menünün yerine geçen değil, basılı menünün hiç
yapamadığını yapan bir menü.

**Kimin için:** kafeler, restoranlar, pastaneler, barlar, oteller, food
truck'lar, bulut mutfaklar. Teknik bilgi gerektirmez; ürün eklemek fotoğraf
paylaşmak kadar kolaydır.

---

## 2. İşletmeye sağladığı temel faydalar

| Fayda | Somut karşılığı |
|---|---|
| **Baskı maliyeti sıfırlanır** | Fiyat değişince yeniden menü bastırmak yok. Bir menü baskısının parasıyla aylarca dijital kalınır. |
| **Fiyat güncellemesi anında yayında** | Kaydet dendiği saniyede açık olan tüm menülerde yeni fiyat görünür. |
| **Tükenen ürün hayal kırıklığı yaratmaz** | Ürün tek tıkla "tükendi" işaretlenir; müşteri sipariş verdikten sonra öğrenmez. |
| **Satış yönlendirilebilir** | "Şefin önerisi", "Popüler", "Yeni" rozetleri ve kampanya etiketleriyle kârlı ürün öne çıkarılır. |
| **Sepetle yanlış sipariş azalır** | Müşteri seçimini sepette toplar, garsona telefonu gösterir. |
| **Bekleme beklentisi yönetilir** | Ürün bazlı hazırlanma süresi (ör. 15–20 dk) şikâyeti ve iptali düşürür. |
| **Yasal ve güven tarafı kapanır** | Alerjen ve kalori bilgisi her üründe gösterilebilir. |
| **Turist trafiği kaybedilmez** | Menü TR / EN / AR / RU çalışır; çevirisi girilmemiş alan ana dile düşer, boş görünmez. |
| **Google'da bulunur** | Menü sayfaları sunucu tarafında render edilir; arama motoru menüyü okur. |
| **Kendi web sitesi olur** | Ayrı ajans, ayrı içerik girişi ve ayrı bakım masrafı olmadan restoran sitesi. |
| **Kararlar veriye dayanır** | Hangi ürünün incelenip sipariş edilmediği, hangi kategorinin hiç açılmadığı görünür. |
| **QR'ın hangisi çalıştığı ölçülür** | Masa, vitrin, Instagram için ayrı QR üretilir; hangisinin taradığı ayrı ayrı görünür. |

---

## 3. Analytics ve bizi farklılaştıran özellikler

Rakiplerin çoğunda "analitik" = menü kaç kez açıldı. menuva'da ölçüm, menünün
**içinde ne olduğunu** anlatır.

### 3.1 Ölçümün kendisi neden farklı

- **Sunucu taraflı toplama.** Event'ler tarayıcıdan doğrudan veritabanına
  yazılmaz; tek bir uçtan (`/api/track`) geçer. Oturum, trafik kaynağı, cihaz ve
  konum sunucuda üretilir — reklam engelleyicilerin es geçtiği, tutarsız,
  şişirilebilir bir ölçüm değil.
- **QR taraması ≠ sayfa görüntüleme.** QR yalnızca oturumun ilk isteğinde ve
  gerçekten QR parametresiyle gelindiyse sayılır. "Menü 4.000 kez açıldı"
  rakamının içi boş çıkmaz.
- **İlk temas atfı.** Kaynak oturum boyunca sabittir: QR → utm → referrer →
  doğrudan. Aynı ziyaret iki kaynağa birden yazılmaz.
- **Kişisel veri toplanmaz.** İsim, e-posta, telefon, tam IP, tam referrer ve
  kesin konum saklanmaz. Ziyaretçi kimliği rastgeledir. KVKK tarafı baştan
  temizdir (bkz. [`docs/analytics-architecture.md`](analytics-architecture.md)).
- **İşletmenin saat dilimi esas alınır.** Günlük ve saatlik kırılımlar
  `Europe/Istanbul`'a göre hesaplanır; "gece 03:00'te patlayan trafik" yanılgısı
  olmaz.

### 3.2 Panelde ne görünüyor

| Alan | İçerik |
|---|---|
| Genel bakış | Menü açılışı, tekil ziyaretçi, oturum süresi, dönemsel karşılaştırma |
| Ürün analizi | Ürün bazlı görüntülenme, sepete ekleme, dönüşüm; ürün detay kırılımı |
| Kategori analizi | Hangi kategori açılıyor, hangisi hiç açılmıyor |
| Trafik | Kaynak (QR / Instagram / Google / doğrudan), cihaz, ülke ve şehir |
| Aktivite | Saat ve gün bazında yoğunluk — vardiya ve kampanya saati kararları için |
| Funnel | Menü → kategori → ürün → sepet dönüşüm hunisi |
| Otomatik içgörüler | "Şu ürün çok inceleniyor ama sepete girmiyor" türü hazır çıkarımlar |
| Menü performans skoru | Menünün bütün olarak nasıl çalıştığına dair tek rakam |
| Rapor Merkezi | Dönemsel raporlar; PDF / Excel / CSV dışa aktarma (Elite) |

### 3.3 Ölçüm dışındaki farklılaştırıcılar

- **Otomatik web sitesi.** Ayrı içerik sistemi yok: panelde girilen bilgi siteye
  dönüşür. Bilgi yoksa o bölüm hiç görünmez, boş bölüm çıkmaz.
- **Çok dilli menü.** TR / EN / AR / RU; ana dil + çeviri modeli, eksik çeviri
  ana dile düşer.
- **Gerçek zamanlı yayın.** Panelde yapılan değişiklik açık menülerde sayfa
  yenilenmeden görünür.
- **Tasarım kalitesi.** Tema, marka rengi, yazı tipi ve yüzey tonu işletmeye
  göre değişir; menü "menuva menüsü" değil "işletmenin menüsü" gibi görünür.
- **Kampanya ve pop-up.** Menü açılışında duyuru; ürün üzerinde indirim yüzdesi
  ve kampanya etiketi.
- **Değerlendirme toplama.** Menü üzerinden hijyen / memnuniyet / tekrar gelme
  geri bildirimi ve Google yorumuna yönlendirme.

---

## 4. Ürün / hizmet matrisi

Aşağıdaki tablo [`lib/entitlements.ts`](../lib/entitlements.ts) içindeki
`FEATURE_MATRIX` ile birebir aynıdır — landing ve panel de bu tablodan beslenir.

| Özellik | Freemium | Premium | Elite |
|---|:--:|:--:|:--:|
| Dijital QR menü | ✅ | ✅ | ✅ |
| Menü görüntülenme | 10.000 | Sınırsız | Sınırsız |
| Kullanım süresi | 3 ay | Sınırsız | Sınırsız |
| **Ürün / kategori sayısı** | **Sınırsız** | **Sınırsız** | **Sınırsız** |
| Temel analizler | ✅ | ✅ | ✅ |
| Gelişmiş analizler | — | ✅ | ✅ |
| Otomatik içgörüler & performans skoru | — | ✅ | ✅ |
| Kampanyalar | — | ✅ | ✅ |
| menuva markasını kaldırma | — | ✅ | ✅ |
| Özel alan adı | — | ✅ | ✅ |
| Standart web sitesi (menüden otomatik) | — | ✅ | ✅ |
| Gelişmiş web sitesi deneyimi | — | — | ✅ |
| **Hediye kurumsal web sitesi** | — | — | **Hediye** |
| Gelişmiş raporlar | — | — | ✅ |
| PDF ve CSV dışa aktarma | — | — | ✅ |
| Analiz verisi saklama süresi | 90 gün | 365 gün | 1.095 gün |

---

## 5. Paket ağacı

```
menuva
│
├── FREEMIUM · 0₺
│   ├── Sınır
│   │   ├── Süre: 3 ay
│   │   ├── Görüntülenme: 10.000
│   │   └── (hangisi önce dolarsa Freemium biter)
│   ├── Sınır YOK
│   │   ├── Ürün sayısı: sınırsız
│   │   └── Kategori sayısı: sınırsız
│   ├── Menü
│   │   ├── Dijital QR menü + özel URL
│   │   ├── Anlık güncelleme (realtime)
│   │   ├── Sepet · arama · çoklu dil
│   │   ├── Rozet · alerjen · kalori · hazırlanma süresi
│   │   └── Varyant / seçenek grupları
│   ├── Analytics
│   │   └── Temel analizler (özet metrikler + son 7 gün)
│   ├── Veri saklama: 90 gün
│   └── Bitince: menü yayını ve ücretli özellikler durur — VERİ SİLİNMEZ
│
├── PREMIUM · 249₺/ay · yıllıkta 199,20₺/ay
│   ├── Freemium'daki her şey, sınırsız
│   │   ├── Süre sınırı yok
│   │   └── Görüntülenme sınırı yok
│   ├── Web sitesi
│   │   └── STANDART WEB SİTESİ (menü verisinden otomatik)
│   │       ├── Hero · hakkında · öne çıkan ürünler · menü
│   │       ├── Çalışma saatleri · konum · yol tarifi
│   │       ├── İletişim · sosyal medya · rezervasyon
│   │       └── Ayrı içerik girişi YOK — panel tek kaynak
│   ├── Analytics
│   │   ├── Gelişmiş analizler (karşılaştırma · funnel · kaynak/cihaz/saat)
│   │   ├── Ürün ve kategori drill-down
│   │   └── Otomatik içgörüler + menü performans skoru
│   ├── Pazarlama
│   │   ├── Kampanyalar ve pop-up
│   │   ├── Özel alan adı
│   │   └── menuva markasını kaldırma
│   └── Veri saklama: 365 gün
│
└── ELITE · 749₺/ay · yıllıkta 599,20₺/ay
    ├── Premium'daki her şey
    ├── Web sitesi
    │   ├── GELİŞMİŞ WEB SİTESİ DENEYİMİ
    │   │   ├── Animasyonlu tanıtım (typewriter)
    │   │   ├── Menü slider'ı
    │   │   └── Ürün görsellerinden otomatik galeri
    │   └── HEDİYE KURUMSAL WEB SİTESİ  ← otomatik siteden BAĞIMSIZ
    │       ├── Standart kurumsal site kurulumu bizden
    │       ├── Tanıtım sayfaları + görsel düzen
    │       ├── Alan adı bağlantısı ve yayına alma
    │       ├── Abonelik sürdüğü sürece kurulum ücreti alınmaz
    │       └── Kapsam dışı: alan adı bedeli, üçüncü taraf servis ücretleri
    ├── Raporlama
    │   ├── Rapor Merkezi (gelişmiş raporlar)
    │   └── PDF · Excel · CSV dışa aktarma
    ├── Destek: öncelikli teknik destek
    └── Veri saklama: 1.095 gün (3 yıl)
```

### 5.1 Premium – Elite web sitesi farkı (netleştirilmiş anlatım)

Satışta karışan nokta buydu; tek cümlelik ayrım şudur:

| | Premium | Elite |
|---|---|---|
| **Standart Web Sitesi** (menü verisinden otomatik üretilen restoran sitesi) | ✅ Var | ✅ Var |
| **Gelişmiş Web Sitesi deneyimi** (animasyonlu tanıtım, menü slider'ı, galeri) | — | ✅ Var |
| **Hediye kurumsal web sitesi** (otomatik siteden bağımsız, kurulumunu bizim yaptığımız site) | — | ✅ Hediye |

Konuşma dili:
- **Premium:** "Menünüzden otomatik bir restoran siteniz olur, ayrıca içerik
  girmenize gerek yok."
- **Elite:** "Aynı site daha zengin bir deneyime yükselir; **ayrıca** kurumsal
  web sitenizi biz kurar, biz yayına alırız — Elite aboneliğine hediyedir."

---

## 6. Paketler ve fiyatlandırma (final)

| Paket | Aylık ödeme | Yıllık ödemede aylık | Yıllık toplam (aylık ödemeyle) | Yıllık toplam (yıllık ödemeyle) |
|---|---:|---:|---:|---:|
| **Freemium** | 0₺ | 0₺ | — | — |
| **Premium** | **249₺** | **199,20₺** | 2.988₺ | **2.390,40₺** |
| **Elite** | **749₺** | **599,20₺** | 8.988₺ | **7.190,40₺** |

- Yıllık ödemede indirim: **%20**.
- Yıllık ödemede bedel dönem başında **tek seferde** tahsil edilir.
- Freemium'da kredi kartı istenmez.

### 6.1 Fiyat gösteriminin final hâli

Karar: **kuruşuna kadar şeffaf gösterim.** İlan edilen rakam faturadaki tutarla
birebir aynı okunur; tam sayılarda kuruş yazılmaz.

- Aylık seçiliyken: **249₺ / ay** — altında "Yıllık ödemede ayda 199,20₺"
- Yıllık seçiliyken: **199,20₺ / ay** — altında "Yıllık 2.390,40₺ tek ödeme · %20 tasarruf"
- Elite için aynı düzen: **749₺ / ay** ve **599,20₺ / ay** · "Yıllık 7.190,40₺ tek ödeme"
- Fiyat toggle'ının varsayılanı **Yıllık** (ilan edilen fiyat yıllık kurguya göre belirlendi).

Biçim kuralı tek yerde: [`lib/pricing.ts`](../lib/pricing.ts) → `formatTL()`.

---

## 7. Yasal sayfalar

Altı metin `menuvaapp.com/yasal` altında yayında; içerik tek kaynakta
([`lib/legal.ts`](../lib/legal.ts)), footer ve sitemap oradan beslenir.

| Sayfa | Adres |
|---|---|
| Gizlilik Politikası | `/yasal/gizlilik-politikasi` |
| KVKK Aydınlatma Metni | `/yasal/kvkk` |
| Kullanım Koşulları | `/yasal/kullanim-kosullari` |
| İptal ve Abonelik Koşulları | `/yasal/abonelik-ve-iptal` |
| Ödeme Koşulları | `/yasal/odeme-kosullari` |
| Faturalandırma Bilgileri | `/yasal/faturalandirma` |

Metinler ürünün gerçekte yaptığı işe göre yazıldı (çerez adları, saklama
süreleri, toplanmayan veriler). **Yayına almadan önce doldurulması gerekenler**
`LEGAL_COMPANY` bloğunda köşeli parantezle işaretli — bkz. §9.

---

## 8. Demo / onboarding işletmesi

Satış görüşmesinde ve onboarding'de gösterilen menü, ürünün vitrinidir. Demo
işletme (`vezirhan`) tek komutla ürünün tüm menü özelliklerini gösterecek
biçimde doldurulur:

```bash
POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/seed-demo-menu.mjs vezirhan --dry
```

Kapsam: **14 kategori, 63 ürün, 30 varyant/seçenek**; yedi rozetin tamamı, on iki
alerjen türünün tamamı, kalori ve hazırlanma süresi, dört indirimli ürün +
kampanya etiketi, iki tükenen ürün, kategori açıklamaları, üç pop-up ve
işletmenin eksik vitrin alanlarının (çalışma saati, özellik rozetleri, wifi)
tamamlanması. Baz dil İngilizce (demo işletmenin ana dili), Türkçe çeviriler
dahil.

> Ürünler görselsiz eklenir. Demo için `--reuse-images` bayrağı, aynı
> kategorideki mevcut ürünlerin görsellerini yeni ürünlere kopyalar; gerçek bir
> işletmede kullanılmaz.

---

## 9. Açık kalan kararlar

Bunlar ürün kararı değil, **şirket/hukuk bilgisi** olduğu için uydurulmadı;
kodda köşeli parantezle işaretli duruyorlar:

| Konu | Nerede | Ne gerekiyor |
|---|---|---|
| Ticari unvan, adres, vergi dairesi/no, MERSİS, VERBİS | `lib/legal.ts` → `LEGAL_COMPANY` | Resmî kayıt bilgileri |
| Ödeme kuruluşu (iyzico / PayTR / …) | `lib/legal.ts` → `paymentProvider` | Anlaşılan sağlayıcı |
| Barındırma ülkesi | `lib/legal.ts` → `hostingLocation` | Veri merkezi konumu (KVKK aktarım maddesi) |
| KDV dâhil mi hariç mi | `lib/legal.ts` → Ödeme Koşulları §1 | Fiyat ilanının yasal ifadesi |
| Yetkili mahkeme / icra dairesi | `lib/legal.ts` → Kullanım Koşulları §9 | Şirket merkezine göre |

Ayrıca ürün tarafında bekleyenler: **online ödeme akışı henüz yok** — ücretli
plana geçiş panel içi geçiş talebi (destek talebi) ya da WhatsApp üzerinden
yürüyor ve yasal metinler bugün bunu anlatıyor. Panelde fatura bilgisi ve fatura
arşivi ekranı da yok; ikisi de devreye alındığında Ödeme ve Faturalandırma
metinlerindeki ilgili maddeler güncellenmelidir.

---

## 10. 2. hafta kararları (7 Eylül 2026 toplantısı)

Toplantıdaki P0 "satış engellerini kaldır" maddelerinin kod karşılığı:

| Konu | Karar | Nerede |
|---|---|---|
| Freemium ürün sınırı | **Sınırsız.** "Maksimum 30 ürün" metni canlıdaki bayat `menuva_plans` kaydından geliyordu. | `scripts/plan-catalog.mjs` |
| Landing fiyat kartları | Artık veritabanından değil **koddaki katalogdan** okunur; DB bayat kalsa bile sitede çelişki çıkmaz. | `components/pricing-plans.tsx` |
| Faz 1 kapsamı | "Temel sipariş yönetimi" yok; doğru ifade **"Sepet: müşteri seçimini garsona gösterir"**. SSS'de açıkça "sipariş/ödeme almıyor" yazıyor. | katalog + `components/pricing.tsx` |
| Elite'in ana değeri | **Gelişmiş web sitesi + hediye kurumsal site + rapor merkezi + öncelikli destek.** API / white label / güvenlik araçları ürün bugün sunmadığı için vaat edilmez (`api_access: false`). | katalog + `tests/plan-catalog.test.ts` |
| Yıllık fiyat gösterimi | "Aylık karşılığı 199,20₺ / ay" + hemen altında aynı okunurlukta "Yıllık 2.390,40₺ peşin". | `components/pricing-plans.tsx` |
| Satın alma yolu | Freemium → kayıt. Premium → **"Premium'u başlat"**: kayıt (`?plan=premium`) → panel Plan sayfasında geçiş talebi. Elite → "Elite demo al" (WhatsApp demo görüşmesi). WhatsApp artık yalnızca ikincil yol. | `app/panel/(dashboard)/plan/page.tsx` |
| Analiz/Rapor yüklenmeme hatası | Paralel isteklerde aynı günün iki kez rollup'lanması `idx_stats_unique` çakışmasıyla 500 dönüyordu; artık upsert + tekilleştirme + hata toleransı. | `lib/analytics/rollup.ts` |

Sosyal kanıt kuralı: kartlardaki sayılar canlı menüden okunur; müşteri yorumu
yalnızca işletmenin onayladığı gerçek bir cümleyse `lib/showcase.ts`'e yazılır.
Vezirhan bir demo menü olduğu için sitede "Demo menü" diye etiketlidir.
