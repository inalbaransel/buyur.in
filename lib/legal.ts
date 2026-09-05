import { ROOT_DOMAIN } from "@/lib/site";
import { PLAN_PRICING, formatTL, yearlyTotal } from "@/lib/pricing";

// Yasal metinlerin tek kaynağı: Gizlilik, KVKK, Kullanım, Abonelik/İptal,
// Ödeme ve Faturalandırma. Altı sayfa da app/yasal/[doc] altında aynı
// bileşenle basılır; başlık/sıra/link üretimi buradan okunur.
//
// ÖNEMLİ — metinler ürünün gerçekte yaptığı işe göre yazıldı (çerez adları,
// saklama süreleri, toplanmayan veriler; bkz. docs/analytics-architecture.md).
// Şirketin ticari/hukuki kimliğine dair alanlar UYDURULMADI: aşağıdaki
// LEGAL_COMPANY köşeli parantezli yer tutucularla geliyor. Yayına almadan önce
// bu bloğu doldurun ve metni bir hukukçuya okutun — bu dosya hukuki danışmanlık
// değil, ürünün işleyişinin dürüst bir dökümüdür.

export const LEGAL_COMPANY = {
  /** Ticaret sicilindeki tam unvan (ör. "... Bilişim A.Ş."). */
  legalName: "[ŞİRKET TİCARİ UNVANI]",
  /** Markanın kamuya görünen adı. */
  brand: "menuva",
  address: "[ŞİRKET AÇIK ADRESİ]",
  taxOffice: "[VERGİ DAİRESİ]",
  taxNumber: "[VERGİ KİMLİK NUMARASI]",
  mersis: "[MERSİS NUMARASI]",
  /** KVKK Veri Sorumluları Sicili kaydı; yükümlülük doğmuyorsa "Muaf" yazın. */
  verbis: "[VERBİS KAYIT NUMARASI]",
  email: "merhaba@menuva.app",
  phone: "+90 535 763 19 08",
  /** Ödeme altyapısı sağlayıcısı (ör. iyzico, PayTR). */
  paymentProvider: "[ÖDEME KURULUŞU]",
  /** Barındırma/veri merkezi konumu (ör. "Türkiye", "Almanya (AB)"). */
  hostingLocation: "[BARINDIRMA ÜLKESİ]",
} as const;

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  /** Basit iki sütunlu tablo (etiket → değer). */
  rows?: { label: string; value: string }[];
  /** Liste/tablodan SONRA gelen açıklama satırları. */
  footnotes?: string[];
}

export interface LegalDoc {
  slug: string;
  /** Sayfa başlığı. */
  title: string;
  /** Footer ve liste sayfasında kullanılan kısa ad. */
  navLabel: string;
  /** Meta description ve liste sayfasındaki açıklama. */
  summary: string;
  /** Son güncelleme (ISO tarih). Metni değiştirdiğinizde GÜNCELLEYİN. */
  updated: string;
  intro: string[];
  sections: LegalSection[];
}

/** Metinlerin tamamı bu tarihte yazıldı; madde değişince ilgili dokümanınkini
 *  elle ilerletin (yürürlük tarihi kullanıcıya gösteriliyor). */
const WRITTEN_ON = "2026-09-05";

const C = LEGAL_COMPANY;
const premium = PLAN_PRICING.premium;
const elite = PLAN_PRICING.elite;

const PRICE_TABLE: { label: string; value: string }[] = [
  { label: "Freemium", value: "0₺ — 3 ay veya 10.000 menü görüntülenme (hangisi önce dolarsa)" },
  {
    label: "Premium — aylık ödeme",
    value: `${formatTL(premium.monthly)} / ay (yıllık toplam ${formatTL(premium.monthly * 12)})`,
  },
  {
    label: "Premium — yıllık ödeme",
    value: `${formatTL(premium.yearlyMonthly)} / ay · yılda tek çekim ${formatTL(yearlyTotal(premium))}`,
  },
  {
    label: "Elite — aylık ödeme",
    value: `${formatTL(elite.monthly)} / ay (yıllık toplam ${formatTL(elite.monthly * 12)})`,
  },
  {
    label: "Elite — yıllık ödeme",
    value: `${formatTL(elite.yearlyMonthly)} / ay · yılda tek çekim ${formatTL(yearlyTotal(elite))}`,
  },
];

// ─── 1. Gizlilik Politikası ────────────────────────────────────────────

const PRIVACY: LegalDoc = {
  slug: "gizlilik-politikasi",
  title: "Gizlilik Politikası",
  navLabel: "Gizlilik Politikası",
  summary:
    "menuva'nın hangi verileri topladığı, neden topladığı, ne kadar sakladığı ve kiminle paylaştığı.",
  updated: WRITTEN_ON,
  intro: [
    `Bu politika, ${C.brand} platformunda (${ROOT_DOMAIN} ve işletmelere ait alt alan adları) hangi verilerin işlendiğini anlatır. İki farklı kişi grubundan söz ediyoruz: platforma kayıt olan işletme sahipleri ve menüyü telefonundan açan misafirler.`,
    "Kısa özet: menüyü açan misafirin adını, e-postasını, telefonunu ya da tam IP adresini saklamıyoruz. Ölçüm verisi işletmeye tekil kişiyi değil, toplamı gösterir.",
  ],
  sections: [
    {
      heading: "1. Veri sorumlusu",
      paragraphs: [
        `Platformun veri sorumlusu ${C.legalName} (${C.address}) şirketidir. Sorularınız için ${C.email} adresine yazabilirsiniz.`,
        "İşletmeler kendi menülerine ait içeriğin ve kendi müşteri iletişiminin sorumlusudur; menuva bu içerik bakımından veri işleyen konumundadır.",
      ],
    },
    {
      heading: "2. İşletme hesabından toplanan veriler",
      list: [
        "Hesap bilgileri: ad, e-posta adresi, şifre (geri döndürülemez biçimde şifrelenmiş olarak saklanır).",
        "İşletme bilgileri: işletme adı, menü adresi (slug), açıklama, logo ve kapak görselleri, çalışma saatleri, adres, telefon, WhatsApp, sosyal medya adresleri.",
        "Menü içeriği: kategoriler, ürünler, fiyatlar, görseller, alerjen/kalori bilgileri, kampanyalar ve pop-up'lar.",
        "Abonelik bilgileri: seçilen paket, başlangıç ve bitiş tarihi, ödeme durumu ve fatura bilgileri.",
        "Destek yazışmaları: panel üzerinden açtığınız destek talepleri ve içerikleri.",
      ],
    },
    {
      heading: "3. Menüyü açan misafirlerden toplanan veriler",
      paragraphs: [
        "Misafir tarafında ölçüm, tarayıcıdan doğrudan veritabanına değil, sunucumuzdaki tek bir uç üzerinden toplanır. Toplanan alanlar şunlardır:",
      ],
      list: [
        "Oturum ve ziyaretçi kimliği: rastgele üretilmiş, kişiye bağlanamayan kimlikler (çerez olarak saklanır).",
        "Sayfa ve ürün görüntülemeleri, menüde geçirilen süre, arama yapılan terimler, sepete ekleme ve dil değişimi gibi menü içi hareketler.",
        "Trafik kaynağı: QR kod, sosyal medya, arama motoru ya da doğrudan giriş bilgisi (tam referrer adresi saklanmaz).",
        "Cihaz türü (mobil/masaüstü/tablet) ve tarayıcı bilgisi.",
        "Ülke ve şehir bilgisi — yalnızca barındırma altyapısı bu bilgiyi sağlıyorsa ve yalnızca bu düzeyde; kesin konum kullanılmaz.",
      ],
    },
    {
      heading: "4. Toplamadığımız veriler",
      paragraphs: [
        "Menüyü açan misafirden isim, e-posta, telefon numarası, tam IP adresi, tam referrer adresi ve kesin konum bilgisi toplanmaz. IP adresi yalnızca isteğin geldiği anda kötüye kullanım/aşırı istek kontrolü için geçici olarak kullanılır, kayda yazılmaz.",
        "Sepet bilgisi misafirin kendi cihazında kalır; sipariş ve ödeme akışı platform üzerinden yürütülmez.",
      ],
    },
    {
      heading: "5. Çerezler",
      rows: [
        { label: "mv_sid", value: "Oturum çerezi. 30 dakika hareketsizlikte sona erer. Ölçümün aynı ziyareti tek oturum sayması için gereklidir." },
        { label: "mv_vid", value: "Ziyaretçi çerezi. 1 yıl saklanır, rastgele bir kimliktir; parmak izi çıkarımı yapılmaz." },
        { label: "Panel oturum çerezi", value: "İşletme sahibinin panelde oturumunu açık tutar." },
        { label: "Google Analytics çerezleri", value: "Tanıtım sitesi ve menü sayfalarının kullanım istatistikleri için Google Analytics kullanılır." },
        { label: "Vercel Analytics", value: "Sayfa performansı ve ziyaret istatistiği ölçümü." },
      ],
    },
    {
      heading: "6. Verileri neden işliyoruz",
      list: [
        "Hizmetin kendisini sunmak: menüyü yayınlamak, paneli çalıştırmak, QR kodu üretmek.",
        "İşletmeye analiz sağlamak: hangi ürünün ne kadar incelendiği, trafiğin nereden geldiği.",
        "Abonelik ve faturalandırma süreçlerini yürütmek.",
        "Güvenlik: kötüye kullanım, bot trafiği ve aşırı istek denemelerini engellemek.",
        "Yasal yükümlülükleri yerine getirmek (ör. fatura saklama).",
      ],
    },
    {
      heading: "7. Saklama süreleri",
      rows: [
        { label: "Ham ölçüm kaydı — Freemium", value: "90 gün" },
        { label: "Ham ölçüm kaydı — Premium", value: "365 gün" },
        { label: "Ham ölçüm kaydı — Elite", value: "1.095 gün (3 yıl)" },
        { label: "Özetlenmiş (toplu) istatistikler", value: "Hesap açık olduğu sürece" },
        { label: "Hesap ve menü içeriği", value: "Hesap silinene kadar; silme talebinden sonra en geç 30 gün içinde kaldırılır" },
        { label: "Fatura ve ödeme kayıtları", value: "Vergi mevzuatının öngördüğü süre (10 yıl)" },
      ],
      footnotes: [
        "Plan düştüğünde geçmiş veriler silinmez; yalnızca erişim planın kapsamına göre kısıtlanır.",
      ],
    },
    {
      heading: "8. Paylaşım ve aktarım",
      list: [
        `Barındırma ve depolama altyapısı: uygulama, veritabanı ve görsel depolama hizmetleri ${C.hostingLocation} konumundaki sunucularda çalışır.`,
        "Ölçüm sağlayıcıları: Google Analytics ve Vercel Analytics.",
        `Ödeme altyapısı: ${C.paymentProvider}. Kart bilgileri menuva sunucularına hiçbir aşamada gelmez ve saklanmaz.`,
        "Yasal talep: yetkili kamu kurumlarının mevzuata uygun talepleri.",
      ],
      footnotes: [
        "Verilerinizi pazarlama amacıyla üçüncü taraflara satmıyor, kiralamıyor veya devretmiyoruz.",
      ],
    },
    {
      heading: "9. Güvenlik",
      list: [
        "Tüm trafik HTTPS üzerinden şifrelenir.",
        "Şifreler geri döndürülemez biçimde saklanır; destek ekibi dâhil hiç kimse şifrenizi göremez.",
        "Panel ve analiz uçlarında yetki kontrolü sunucu tarafında yapılır; bir işletme yalnızca kendi verisine erişebilir.",
        "Görsel yüklemelerinde dosya sahipliği doğrulanır.",
      ],
    },
    {
      heading: "10. Haklarınız ve iletişim",
      paragraphs: [
        `Kişisel verilerinize ilişkin haklarınızı KVKK Aydınlatma Metni'nde ayrıntılı bulabilirsiniz. Taleplerinizi ${C.email} adresine iletebilirsiniz; başvurular en geç 30 gün içinde sonuçlandırılır.`,
        "Bu politikada değişiklik olduğunda güncel metin bu sayfada yayımlanır ve yukarıdaki yürürlük tarihi değiştirilir.",
      ],
    },
  ],
};

// ─── 2. KVKK Aydınlatma Metni ──────────────────────────────────────────

const KVKK: LegalDoc = {
  slug: "kvkk",
  title: "KVKK Aydınlatma Metni",
  navLabel: "KVKK Metni",
  summary:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu, işleme amaçları, hukuki sebepler ve ilgili kişi hakları.",
  updated: WRITTEN_ON,
  intro: [
    `Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi ile Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca ${C.legalName} tarafından hazırlanmıştır.`,
  ],
  sections: [
    {
      heading: "1. Veri sorumlusunun kimliği",
      rows: [
        { label: "Unvan", value: C.legalName },
        { label: "Adres", value: C.address },
        { label: "Vergi dairesi / no", value: `${C.taxOffice} / ${C.taxNumber}` },
        { label: "MERSİS", value: C.mersis },
        { label: "VERBİS", value: C.verbis },
        { label: "E-posta", value: C.email },
      ],
    },
    {
      heading: "2. İşlenen kişisel veri kategorileri",
      rows: [
        { label: "Kimlik", value: "Ad, soyad (işletme yetkilisi)" },
        { label: "İletişim", value: "E-posta, telefon, WhatsApp numarası, işletme adresi" },
        { label: "Müşteri işlem", value: "Abonelik paketi, başlangıç/bitiş tarihi, ödeme ve fatura kayıtları" },
        { label: "İşlem güvenliği", value: "Oturum kayıtları, çerez kimlikleri, kötüye kullanım kontrolü kayıtları" },
        { label: "Pazarlama / kullanım", value: "Menü içi hareket verileri (kişiye bağlanamayan rastgele kimliklerle)" },
      ],
    },
    {
      heading: "3. Kişisel verilerin işlenme amaçları",
      list: [
        "Sözleşmenin kurulması ve ifası: hesabın açılması, menünün yayınlanması, panelin çalıştırılması.",
        "Abonelik yönetimi, ödeme ve faturalandırma süreçlerinin yürütülmesi.",
        "Talep ve şikâyetlerin takibi, destek hizmetinin sunulması.",
        "Bilgi güvenliği süreçlerinin yürütülmesi ve kötüye kullanımın önlenmesi.",
        "Hizmetin geliştirilmesi ve işletmeye toplu (anonim/toplulaştırılmış) analiz sunulması.",
        "Yasal yükümlülüklerin yerine getirilmesi ve hukuki taleplere karşı savunma hakkının kullanılması.",
      ],
    },
    {
      heading: "4. Hukuki sebepler (KVKK m. 5)",
      list: [
        "Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması (m. 5/2-c) — hesap, menü ve abonelik verileri.",
        "Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (m. 5/2-ç) — fatura ve muhasebe kayıtları.",
        "İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat (m. 5/2-f) — güvenlik kayıtları ve toplu kullanım istatistikleri.",
        "Açık rıza (m. 5/1) — yalnızca ticari elektronik ileti gönderimi gibi rızaya bağlı işlemler için alınır.",
      ],
    },
    {
      heading: "5. Toplama yöntemi",
      paragraphs: [
        "Kişisel veriler; panel üzerinden doldurduğunuz formlar, menü sayfalarındaki otomatik ölçüm altyapısı, e-posta ve WhatsApp yazışmaları ile ödeme altyapısından gelen bildirimler aracılığıyla elektronik ortamda toplanır.",
      ],
    },
    {
      heading: "6. Aktarım",
      paragraphs: [
        `Kişisel veriler; hizmetin sunulabilmesi amacıyla barındırma ve depolama sağlayıcılarına (${C.hostingLocation}), ödeme kuruluşuna (${C.paymentProvider}), ölçüm sağlayıcılarına (Google Analytics, Vercel Analytics) ve yasal yükümlülük hâlinde yetkili kamu kurum ve kuruluşlarına aktarılabilir.`,
        "Yurt dışına aktarım gerektiren hizmetlerde KVKK m. 9 kapsamındaki şartlara uyulur.",
      ],
    },
    {
      heading: "7. İlgili kişinin hakları (KVKK m. 11)",
      list: [
        "Kişisel verisinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme.",
        "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.",
        "Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme.",
        "Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme.",
        "Kanundaki şartlar çerçevesinde silinmesini veya yok edilmesini isteme.",
        "Düzeltme, silme ve yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
        "Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhe bir sonucun ortaya çıkmasına itiraz etme.",
        "Kanuna aykırı işleme sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme.",
      ],
    },
    {
      heading: "8. Başvuru yolu",
      paragraphs: [
        `Başvurularınızı ${C.email} adresine e-posta ile ya da ${C.address} adresine yazılı olarak iletebilirsiniz. Başvurunuzda kimliğinizi tespit edici bilgiler ile talebinizin konusunu açıkça belirtiniz.`,
        "Talepler, niteliğine göre en kısa sürede ve her hâlükârda en geç 30 gün içinde sonuçlandırılır. İşlemin ayrıca bir maliyet gerektirmesi hâlinde Kurul'ca belirlenen tarifedeki ücret alınabilir.",
      ],
    },
  ],
};

// ─── 3. Kullanım Koşulları ─────────────────────────────────────────────

const TERMS: LegalDoc = {
  slug: "kullanim-kosullari",
  title: "Kullanım Koşulları",
  navLabel: "Kullanım Koşulları",
  summary:
    "Hizmetin kapsamı, hesap açma, içerik sorumluluğu, yasak kullanımlar ve sözleşmenin sona ermesi.",
  updated: WRITTEN_ON,
  intro: [
    `Bu koşullar, ${C.legalName} tarafından işletilen ${C.brand} platformunun kullanımına ilişkin tarafların hak ve yükümlülüklerini düzenler. Hesap açarak bu koşulları kabul etmiş sayılırsınız.`,
  ],
  sections: [
    {
      heading: "1. Hizmetin kapsamı",
      paragraphs: [
        "menuva; işletmelerin dijital menü oluşturmasını, QR kod ve web adresi üzerinden yayınlamasını, menü performansını ölçmesini ve paketine göre otomatik web sitesi, kampanya ve raporlama özelliklerinden yararlanmasını sağlayan bir yazılım hizmetidir (SaaS).",
        "menuva bir sipariş veya ödeme aracısı değildir; misafirin sepetteki seçimi işletmeye gösterilmek üzere kendi cihazında tutulur.",
      ],
    },
    {
      heading: "2. Hesap açma ve kullanım",
      list: [
        "Hesap açan kişi, işletme adına işlem yapmaya yetkili olduğunu beyan eder.",
        "Bir kullanıcı bir işletmeyi yönetir; hesap bilgilerinin gizliliğinden kullanıcı sorumludur.",
        "Verdiğiniz bilgilerin doğru ve güncel olmasından siz sorumlusunuz.",
        "18 yaşından küçükler hesap açamaz.",
      ],
    },
    {
      heading: "3. İçerik sorumluluğu",
      paragraphs: [
        "Menüye girdiğiniz ürün adları, açıklamalar, görseller, fiyatlar, alerjen ve kalori bilgileri dâhil tüm içerik size aittir ve sorumluluğu size aittir. Özellikle alerjen bilgisinin doğruluğu ve mevzuata uygunluğu işletmenin yükümlülüğündedir.",
        "Yüklediğiniz görseller üzerinde kullanım hakkına sahip olduğunuzu beyan edersiniz. menuva, içeriği yalnızca hizmeti sunmak amacıyla barındırır ve gösterir.",
        "Hukuka aykırı olduğu bildirilen içeriği, bildirim üzerine yayından kaldırma hakkımız saklıdır.",
      ],
    },
    {
      heading: "4. Yasak kullanımlar",
      list: [
        "Hizmeti, üçüncü kişilerin haklarını ihlal edecek ya da hukuka aykırı içerik yayımlamak için kullanmak.",
        "Platformun güvenlik önlemlerini aşmaya çalışmak, otomatik araçlarla aşırı istek göndermek, servisi kesintiye uğratmak.",
        "Başkasına ait işletme adı, marka veya görsellerini izinsiz kullanmak.",
        "Hizmeti tersine mühendislikle çoğaltmak veya rakip bir hizmet üretmek amacıyla kullanmak.",
      ],
    },
    {
      heading: "5. Fikri mülkiyet",
      paragraphs: [
        "Platformun yazılımı, arayüz tasarımı, markası ve dokümantasyonu menuva'ya aittir. Aboneliğiniz size hizmeti kullanma hakkı verir; yazılım üzerinde mülkiyet hakkı devri anlamına gelmez.",
        "Menü içeriğiniz ve işletme görselleriniz size aittir; aboneliğiniz sona erdiğinde bu içerik üzerindeki haklarınız devam eder.",
      ],
    },
    {
      heading: "6. Hizmet sürekliliği",
      paragraphs: [
        "Hizmeti kesintisiz sunmayı hedefliyoruz; ancak planlı bakım, altyapı sağlayıcısı kaynaklı arıza ve mücbir sebep hâllerinde kesinti yaşanabilir. Planlı bakımları önceden duyurmaya çalışırız.",
        "Özelliklerde iyileştirme ve değişiklik yapabiliriz. Paketin kapsamını daraltan esaslı bir değişiklik olursa bunu önceden bildiririz.",
      ],
    },
    {
      heading: "7. Sorumluluğun sınırı",
      paragraphs: [
        "menuva'nın sorumluluğu, zararın doğduğu tarihten önceki 12 ayda ödediğiniz abonelik bedeliyle sınırlıdır. Dolaylı zararlar, kâr kaybı ve veri kaybından doğan talepler kapsam dışıdır.",
        "Menüdeki fiyat, içerik ve alerjen bilgisinin doğruluğundan doğan uyuşmazlıklarda muhatap işletmedir.",
      ],
    },
    {
      heading: "8. Sözleşmenin sona ermesi",
      paragraphs: [
        "Aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz; ayrıntılar İptal ve Abonelik Koşulları sayfasındadır.",
        "Bu koşullara ağır aykırılık hâlinde hesabı askıya alabilir veya sonlandırabiliriz. Bu durumda, ödenmiş ancak kullanılmamış döneme ilişkin bedel iade edilir.",
      ],
    },
    {
      heading: "9. Uygulanacak hukuk ve yetki",
      paragraphs: [
        "Bu koşullara Türk hukuku uygulanır. Uyuşmazlıklarda [YETKİLİ MAHKEME VE İCRA DAİRELERİ] yetkilidir. Tüketici sıfatını haiz kullanıcılar için tüketici hakem heyetleri ve tüketici mahkemelerinin yetkisi saklıdır.",
      ],
    },
  ],
};

// ─── 4. İptal / Abonelik Koşulları ─────────────────────────────────────

const SUBSCRIPTION: LegalDoc = {
  slug: "abonelik-ve-iptal",
  title: "İptal ve Abonelik Koşulları",
  navLabel: "İptal / Abonelik Koşulları",
  summary:
    "Aboneliğin başlaması, yenilenmesi, iptali, cayma hakkı ve iade kuralları.",
  updated: WRITTEN_ON,
  intro: [
    "Bu sayfa, menuva aboneliğinin nasıl başladığını, ne zaman yenilendiğini, nasıl iptal edildiğini ve hangi hâllerde iade yapıldığını açıklar.",
  ],
  sections: [
    {
      heading: "1. Freemium",
      paragraphs: [
        "Freemium ücretsizdir ve kredi kartı istemez. Freemium'da ürün ya da kategori sayısı sınırlı değildir; menünüzün tamamını girebilirsiniz.",
        "Freemium'ın tek sınırı süre ve görüntülenmedir: 3 ay veya 10.000 menü görüntülenmesi. Bu iki limitten hangisi önce dolarsa Freemium sona erer.",
        "Freemium sona erdiğinde verileriniz silinmez. Menünün yayını ve ücretli özellikler durur; ücretli bir pakete geçtiğinizde her şey kaldığı yerden devam eder.",
      ],
    },
    {
      heading: "2. Abonelik dönemi ve yenileme",
      list: [
        "Abonelik, ödemenin alındığı gün başlar ve seçtiğiniz döneme (1 ay veya 12 ay) göre sürer.",
        "Aboneliğiniz, dönem sonunda aynı paket ve dönem için kendiliğinden yenilenir.",
        "Yenileme öncesinde bilgilendirme yapılır; yenilemeyi durdurmak için dönem bitmeden iptal etmeniz yeterlidir.",
        "Yıllık abonelikte bedel dönem başında tek seferde tahsil edilir.",
      ],
    },
    {
      heading: "3. İptal",
      paragraphs: [
        `Aboneliğinizi dilediğiniz an iptal edebilirsiniz. İptal talebinizi ${C.email} adresine e-posta göndererek ya da ${C.phone} numarasından WhatsApp ile iletebilirsiniz.`,
        "İptal, içinde bulunduğunuz dönemin sonunda geçerli olur: ödediğiniz dönem boyunca hizmeti kullanmaya devam edersiniz, sonrasında ücret alınmaz ve hesabınız Freemium koşullarına döner.",
        "Taahhüt yoktur; aylık ödemede istediğiniz ay bırakabilirsiniz.",
      ],
    },
    {
      heading: "4. Cayma hakkı",
      paragraphs: [
        "Mesafeli Sözleşmeler Yönetmeliği uyarınca, elektronik ortamda anında ifa edilen hizmetlerde cayma hakkı kural olarak kullanılamaz. Buna rağmen, ilk kez ücretli pakete geçen aboneler için ödeme tarihinden itibaren 14 gün içinde yapılan iptal taleplerinde bedeli iade ediyoruz.",
        "İade, ödemenin yapıldığı yönteme ve aynı karta yapılır; bankaya bağlı olarak hesabınıza geçmesi 3-10 iş günü sürebilir.",
      ],
    },
    {
      heading: "5. İade yapılmayan hâller",
      list: [
        "14 günlük süre geçtikten sonra, kullanılmakta olan dönemin kalanı için iade yapılmaz.",
        "Kullanım koşullarına ağır aykırılık nedeniyle hesabın kapatıldığı hâller (bu durumda kullanılmamış dönem bedeli iade edilir).",
        "Elite paketi kapsamında kurulumu tamamlanmış hediye kurumsal web sitesi gibi, iadesi mümkün olmayan tamamlanmış hizmetler.",
      ],
    },
    {
      heading: "6. Paket değişikliği",
      paragraphs: [
        "Üst pakete geçişte, kalan dönem için ödediğiniz tutar yeni paketin bedelinden mahsup edilir ve fark tahsil edilir. Geçiş anında yeni paketin özellikleri açılır.",
        "Alt pakete geçiş, içinde bulunduğunuz dönemin sonunda yürürlüğe girer; aradaki fark iade edilmez.",
      ],
    },
    {
      heading: "7. Fiyat değişikliği",
      paragraphs: [
        "Fiyatlarımızı güncelleyebiliriz. Değişiklik, mevcut abonelikler için ancak bir sonraki yenileme döneminde ve en az 30 gün önceden bildirilerek uygulanır. Yeni fiyatı kabul etmiyorsanız, yenileme tarihinden önce iptal edebilirsiniz.",
      ],
    },
    {
      heading: "8. Hesap ve veri silme",
      paragraphs: [
        `Hesabınızın tamamen silinmesini isterseniz ${C.email} adresine yazın. Talep üzerine menü içeriğiniz, görselleriniz ve analiz kayıtlarınız en geç 30 gün içinde silinir; fatura kayıtları yasal saklama süresince tutulmaya devam eder.`,
      ],
    },
  ],
};

// ─── 5. Ödeme Koşulları ────────────────────────────────────────────────

const PAYMENT: LegalDoc = {
  slug: "odeme-kosullari",
  title: "Ödeme Koşulları",
  navLabel: "Ödeme Koşulları",
  summary: "Fiyatlar, ödeme yöntemleri, tahsilat zamanı, başarısız ödeme ve güvenlik.",
  updated: WRITTEN_ON,
  intro: [
    "Bu sayfa, menuva abonelik bedellerinin nasıl belirlendiğini ve nasıl tahsil edildiğini açıklar. Fiyat değişikliği kuralları için İptal ve Abonelik Koşulları sayfasına bakınız.",
  ],
  sections: [
    {
      heading: "1. Güncel fiyatlar",
      rows: PRICE_TABLE,
      footnotes: [
        "Yıllık ödemede aylık maliyet %20 düşer ve bedel dönem başında tek seferde tahsil edilir. Tüm tutarlar Türk Lirası (₺) cinsindendir.",
        "Fiyatlara KDV dâhil/hariç durumu: [KDV DURUMU — ör. \"Fiyatlara %20 KDV dâhildir\"].",
      ],
    },
    {
      heading: "2. Ödeme yöntemleri",
      list: [
        `Kredi kartı ve banka kartı ile online ödeme (${C.paymentProvider} altyapısı).`,
        "Havale/EFT ile ödeme — kurumsal aboneler için talep üzerine.",
      ],
      footnotes: [
        "Kart bilgileriniz ödeme kuruluşunun güvenli altyapısında işlenir; menuva sunucularına iletilmez ve saklanmaz.",
        `Ücretli paketlere geçiş şu anda ${C.email} ve WhatsApp üzerinden başlatılmakta; ödeme bağlantısı tarafımızdan iletilmektedir. Site içi online ödeme akışı devreye alındığında bu sayfa güncellenecektir.`,
      ],
    },
    {
      heading: "3. Tahsilat zamanı",
      list: [
        "İlk ödeme, paketi seçip ödemeyi tamamladığınız anda alınır ve abonelik aynı gün başlar.",
        "Aylık aboneliklerde ödeme her ay aynı gün, yıllık aboneliklerde her yıl aynı gün yenilenir.",
        "Yenileme günü ayın karşılığı olmayan bir gününe denk gelirse (ör. 31'i), o ayın son günü esas alınır.",
      ],
    },
    {
      heading: "4. Başarısız ödeme",
      paragraphs: [
        "Yenileme ödemesi alınamazsa hizmet hemen kapatılmaz. Ödeme birkaç gün içinde tekrar denenir ve size bildirim yapılır. 7 gün içinde ödeme alınamazsa hesap Freemium koşullarına döner; menü ve verileriniz silinmez.",
      ],
    },
    {
      heading: "5. Güvenlik",
      list: [
        "Ödeme sayfası ve tüm trafik SSL/TLS ile şifrelenir.",
        "3D Secure doğrulaması, kartınızın ve bankanızın desteklediği ölçüde uygulanır.",
        "menuva kart numarası, son kullanma tarihi ve CVV bilgisini hiçbir aşamada görmez ve saklamaz.",
      ],
    },
    {
      heading: "6. Uyuşmazlık ve destek",
      paragraphs: [
        `Ödemenizle ilgili bir sorun olursa önce ${C.email} adresinden bize yazın; talebi en geç 5 iş günü içinde sonuçlandırırız. İtiraz sürecini bankanızla başlatmadan önce bizimle iletişime geçmeniz çözümü hızlandırır.`,
      ],
    },
  ],
};

// ─── 6. Faturalandırma Bilgileri ───────────────────────────────────────

const BILLING: LegalDoc = {
  slug: "faturalandirma",
  title: "Faturalandırma Bilgileri",
  navLabel: "Faturalandırma Bilgileri",
  summary: "Satıcı bilgileri, faturanın düzenlenmesi, gönderimi ve fatura bilgisi değişikliği.",
  updated: WRITTEN_ON,
  intro: [
    "Abonelik bedelleri için düzenlenen faturaya, faturanın nasıl ulaştığına ve bilgilerin nasıl güncelleneceğine dair kurallar.",
  ],
  sections: [
    {
      heading: "1. Satıcı bilgileri",
      rows: [
        { label: "Ticari unvan", value: C.legalName },
        { label: "Adres", value: C.address },
        { label: "Vergi dairesi", value: C.taxOffice },
        { label: "Vergi kimlik no", value: C.taxNumber },
        { label: "MERSİS no", value: C.mersis },
        { label: "E-posta", value: C.email },
        { label: "Telefon", value: C.phone },
        { label: "Web", value: ROOT_DOMAIN },
      ],
    },
    {
      heading: "2. Faturanın düzenlenmesi",
      list: [
        "Fatura, ödemenin alındığı tarihten itibaren 7 gün içinde düzenlenir.",
        "Aylık aboneliklerde her dönem için ayrı fatura kesilir; yıllık abonelikte tek fatura düzenlenir.",
        "Fatura, bize bildirdiğiniz fatura e-posta adresine elektronik olarak gönderilir.",
        "Kurumsal aboneler için e-Fatura / e-Arşiv Fatura düzenlenir.",
      ],
    },
    {
      heading: "3. Fatura bilgileriniz",
      paragraphs: [
        "Doğru fatura düzenlenebilmesi için aşağıdaki bilgileri abonelik başlarken bize iletmeniz gerekir:",
      ],
      list: [
        "Şahıs veya şirket olarak fatura tipi",
        "Ticari unvan veya ad-soyad",
        "Vergi dairesi ve vergi kimlik numarası (şahıslarda T.C. kimlik numarası)",
        "Fatura adresi",
        "Fatura e-posta adresi",
      ],
    },
    {
      heading: "4. Bilgi değişikliği ve düzeltme",
      paragraphs: [
        `Fatura bilgilerinizde değişiklik olduğunda, bir sonraki dönem faturası kesilmeden önce ${C.email} adresine bildirin. Kesilmiş bir faturada hata varsa yine bu adrese yazın; düzeltme faturası düzenlenir.`,
        "Yanlış veya eksik bilgi nedeniyle hatalı düzenlenen faturalardan doğan sorumluluk, bilgiyi giren aboneye aittir.",
      ],
    },
    {
      heading: "5. Fatura arşivi",
      paragraphs: [
        `Geçmiş faturalarınızın kopyasını ${C.email} adresinden talep edebilirsiniz. Faturalar vergi mevzuatı uyarınca 10 yıl süreyle saklanır.`,
      ],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [PRIVACY, KVKK, TERMS, SUBSCRIPTION, PAYMENT, BILLING];

export function legalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((doc) => doc.slug === slug);
}

export function legalPath(slug: string): string {
  return `/yasal/${slug}`;
}

export function formatLegalDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
}
