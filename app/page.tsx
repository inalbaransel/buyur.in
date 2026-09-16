import { Footer } from "@/components/chrome";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { HowItWorks, ProblemSolution } from "@/components/features";
import { LiveMenu } from "@/components/live-menu";
import { PanelShowcase } from "@/components/panel-showcase";
import { Analytics } from "@/components/analytics";
import { Showcase } from "@/components/showcase";
import { Pricing, FAQ, ClosingCTA } from "@/components/pricing";
import { Comparison } from "@/components/comparison";
import { LandingTracker } from "@/components/landing-tracker";
import { DEMO_SLUG, loadShowcase } from "@/lib/showcase";
import { ROOT_DOMAIN } from "@/lib/site";

// Sosyal kanıt kartları canlı menülerden okunuyor; sayfa statik üretilip
// 10 dakikada bir tazelenir. (Fiyat kartları artık veritabanına değil koddaki
// tek kaynağa bakıyor — bkz. components/pricing-plans.tsx.)
export const revalidate = 600;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "buyur",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: `https://${ROOT_DOMAIN}`,
  logo: `https://${ROOT_DOMAIN}/buyur-icon.png`,
  description:
    "Restoran, kafe, pastane ve oteller için QR menü: menünüzü dakikalar içinde kurun, fiyatları anında değiştirin, ürünleri öne çıkarın ve müşterinin seçimini garsona eksiksiz gösterin.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
};

// Önerilen huni: sonuç odaklı hero → kanıt → üç sorun/çözüm → canlı menü →
// gerçek panel ekranları → analitik → nasıl çalışır → sosyal kanıt → paketler →
// karşılaştırma → SSS → final CTA.
export default async function Home() {
  const showcase = await loadShowcase();
  const proof = showcase[0] ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
