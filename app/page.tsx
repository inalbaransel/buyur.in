import { Footer } from "@/components/chrome";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { HowItWorks, ProblemSolution } from "@/components/features";
import { LiveMenu } from "@/components/live-menu";
import { PanelShowcase } from "@/components/panel-showcase";
import { Analytics } from "@/components/analytics";
import { Showcase } from "@/components/showcase";
import { Pricing, FAQ, ClosingCTA, faqs } from "@/components/pricing";
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
import { PLAN_PRICING } from "@/lib/pricing";

// Sosyal kanıt kartları canlı menülerden okunuyor; sayfa statik üretilip
// 10 dakikada bir tazelenir. (Fiyat kartları artık veritabanına değil koddaki
// tek kaynağa bakıyor — bkz. components/pricing-plans.tsx.)
export const revalidate = 600;

// Ürün kartı: Google "yazılım" sonuçlarında fiyat aralığını ve özellikleri
// buradan okur. Fiyatlar lib/pricing.ts'teki tek kaynaktan gelir.
const productJsonLd = {
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
      description: "3 ay veya 10.000 menü görüntülenmesine kadar ücretsiz. Kredi kartı istenmez.",
      availability: "https://schema.org/InStock",
    },
    ...(["premium", "elite"] as const).map((key) => ({
      "@type": "Offer" as const,
      name: key === "premium" ? "Premium" : "Elite",
      price: String(PLAN_PRICING[key].monthly),
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(PLAN_PRICING[key].monthly),
        priceCurrency: "TRY",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "MON",
        },
      },
    })),
  ],
};

// Sık sorulanlar bölümünün makine okunur karşılığı — arama sonucunda
// açılır cevap olarak görünebilir.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// Önerilen huni: sonuç odaklı hero → kanıt → üç sorun/çözüm → canlı menü →
// gerçek panel ekranları → analitik → nasıl çalışır → sosyal kanıt → paketler →
// karşılaştırma → SSS → final CTA.
export default async function Home() {
  const showcase = await loadShowcase();
  const proof = showcase[0] ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(productJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
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
