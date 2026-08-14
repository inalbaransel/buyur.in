import { Footer } from "@/components/chrome";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { MenuFeatures, AdminTools, HowItWorks } from "@/components/features";
import { Analytics } from "@/components/analytics";
import { Pricing, FAQ, ClosingCTA } from "@/components/pricing";
import { createServerPB } from "@/lib/pocketbase";
import { ROOT_DOMAIN } from "@/lib/site";
import type { PlanRecord } from "@/lib/types";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "menuva",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: `https://${ROOT_DOMAIN}`,
  logo: `https://${ROOT_DOMAIN}/menuva-icon.png`,
  description:
    "Restoranlar ve kafeler için dijital QR menü platformu. Menünüzü dakikalar içinde dijitalleştirin, fiyat güncelleyin, kampanya ekleyin, QR kodla paylaşın.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
};

async function getActivePlans(): Promise<PlanRecord[]> {
  const pb = createServerPB();
  try {
    return await pb.collection("menuva_plans").getFullList<PlanRecord>({
      filter: "is_active = true",
      sort: "order",
      requestKey: null,
    });
  } catch {
    // PocketBase'e ulaşılamıyorsa Pricing kendi statik yedeğine düşer.
    return [];
  }
}

export default async function Home() {
  const plans = await getActivePlans();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main>
        <Hero />
        <MenuFeatures />
        <AdminTools />
        <Analytics />
        <HowItWorks />
        <Pricing plans={plans} />
        <FAQ />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  );
}
