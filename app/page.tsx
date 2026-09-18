import { Footer } from "@/components/chrome";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { HowItWorks, ProblemSolution } from "@/components/features";
import { LiveMenu } from "@/components/live-menu";
import { PanelShowcase } from "@/components/panel-showcase";
import { Analytics } from "@/components/analytics";
import { Showcase } from "@/components/showcase";
import { Pricing, FAQ, ClosingCTA, getFaqs } from "@/components/pricing";
import { Comparison } from "@/components/comparison";
import { LandingTracker } from "@/components/landing-tracker";
import { DEMO_SLUG, loadShowcase } from "@/lib/showcase";
import {
  BRAND_ICON,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  jsonLdScript,
} from "@/lib/seo";
import { planPricing } from "@/lib/pricing";
import { freemiumLimits } from "@/lib/entitlements";
import { ensurePlanCatalog } from "@/lib/plan-catalog-loader";
import { createServerPB } from "@/lib/pocketbase";

// Sosyal kanıt kartları ve plan/fiyat bilgisi canlı kayıtlardan (menüler,
// `buyur_plans`) okunuyor; sayfa statik üretilip dakikada bir tazelenir.
export const revalidate = 60;

// Ürün kartı: Google "yazılım" sonuçlarında fiyat aralığını ve özellikleri
// buradan okur. Fiyatlar lib/pricing.ts'teki tek kaynaktan gelir.
const buildProductJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#app`,
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "QR Menü",
  operatingSystem: "Web, iOS, Android",
  url: SITE_URL,
  logo: BRAND_ICON,
  screenshot: absoluteUrl(OG_IMAGE.url),
  inLanguage: "tr-TR",
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#organization` },
  featureList: [
    "Dakikalar içinde kurulan QR menü",
    "Anında fiyat ve stok güncelleme",
    "Masa bazlı QR kod üretimi",
    "Menü görüntülenme ve ürün analizleri",
    "Kampanya ve öne çıkarma araçları",
    "Çok dilli menü",
    "Menüden otomatik oluşan web sitesi",
  ],
  offers: [
    {
      "@type": "Offer",
      name: "Freemium",
      price: "0",
      priceCurrency: "TRY",
      description: `${freemiumLimits().summary} kadar ücretsiz. Kredi kartı istenmez.`,
      availability: "https://schema.org/InStock",
    },
    // Fiyatı bilinmeyen (kayıt okunamamış) plan için teklif üretilmez: rakam uydurulmaz.
    ...(["premium", "elite"] as const).flatMap((key) => {
      const pricing = planPricing(key);
      if (!pricing) return [];
      return [{
      "@type": "Offer" as const,
      name: key === "premium" ? "Premium" : "Elite",
      price: String(pricing.monthly),
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(pricing.monthly),
        priceCurrency: "TRY",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "MON",
        },
      },
    }];
    }),
  ],
});

// Sık sorulanlar bölümünün makine okunur karşılığı — arama sonucunda
// açılır cevap olarak görünebilir.
// Plan limitleri canlı katalogdan geldiği için sayfa render'ında kurulur.
const buildFaqJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: getFaqs().map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

// Önerilen huni: sonuç odaklı hero → kanıt → üç sorun/çözüm → canlı menü →
// gerçek panel ekranları → analitik → nasıl çalışır → sosyal kanıt → paketler →
// karşılaştırma → SSS → final CTA.
export default async function Home() {
  // Plan limitleri ve paket metinleri canlı `buyur_plans` kaydından gelir.
  const [showcase] = await Promise.all([loadShowcase(), ensurePlanCatalog(createServerPB())]);
  const proof = showcase[0] ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(buildProductJsonLd())} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(buildFaqJsonLd())} />
      <Navbar />
      <main>
        <Hero proof={proof} />
        <ProblemSolution />
        <LiveMenu
          slug={proof?.slug ?? DEMO_SLUG}
          name={proof?.name ?? "Demo"}
          kind={proof?.kind ?? "demo"}
          stats={proof ? { categories: proof.categories, products: proof.products, languages: proof.languages } : null}
        />
        <PanelShowcase />
        <Analytics />
        <HowItWorks />
        <Showcase items={showcase} />
        <Pricing />
        <Comparison />
        <FAQ />
        <ClosingCTA />
      </main>
      <Footer />
      <LandingTracker />
    </>
  );
}
