import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { createServerPB } from "@/lib/pocketbase";
import { isFeatureAvailable, isSubscriptionActive } from "@/lib/entitlements";
import { buildSiteContent } from "@/lib/site-content";
import { isValidHex, pickReadableOn, visibleFill } from "@/lib/color";
import { getThemeColor } from "@/lib/themes";
import { getFontStack } from "@/lib/fonts";
import { menuUrl } from "@/lib/site";
import {
  ProductCards,
  SiteAbout,
  SiteContact,
  SiteFooter,
  SiteHero,
  SiteLocation,
  SiteMenuList,
  SiteReservationCta,
  SiteSection,
} from "@/components/site/sections";
import { MenuSlider } from "@/components/site/elite-parts";
import { SiteLocaleProvider, SiteLanguageSwitcher } from "@/components/site/site-locale";
import type { Business, Category, Product } from "@/lib/types";

// Otomatik Custom Website (Premium & Elite).
//
// Sunucuda render edilir; içerik tamamen mevcut menuva verisinden türetilir
// (bkz. lib/site-content.ts). Site kurucu, bölüm editörü ya da ikinci bir ürün
// yönetimi yoktur — işletme paneli tek kaynaktır.
//
// Adres: {slug}.menuvaapp.com/site (middleware /site/{slug}'a yazar).
// Menü adresi değişmedi: basılı QR kodları etkilenmez.

export const revalidate = 300;

const getBusiness = cache(async (slug: string): Promise<Business | null> => {
  const pb = createServerPB();
  try {
    return await pb
      .collection("menuva_businesses")
      .getFirstListItem<Business>(pb.filter("slug = {:slug} && is_active = true", { slug }), { requestKey: null });
  } catch {
    return null;
  }
});

const getMenu = cache(async (businessId: string) => {
  const pb = createServerPB();
  const [categories, products] = await Promise.all([
    pb.collection("menuva_categories").getFullList<Category>({
      filter: pb.filter("business = {:id} && is_active = true", { id: businessId }),
      sort: "order,created",
      requestKey: null,
    }),
    pb.collection("menuva_products").getFullList<Product>({
      filter: pb.filter("business = {:id} && is_available = true", { id: businessId }),
      sort: "order,created",
      requestKey: null,
    }),
  ]);
  return { categories, products };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business || !isFeatureAvailable(business, "custom_website")) return {};

  const description =
    business.description ||
    `${business.name} — menü, çalışma saatleri, konum ve rezervasyon bilgileri.`;

  return {
    title: `${business.name}`,
    description,
    openGraph: {
      title: business.name,
      description,
      images: business.cover_url ? [business.cover_url] : undefined,
      type: "website",
    },
    alternates: { canonical: `${menuUrl(business.slug)}/site` },
  };
}

export default async function RestaurantSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);

  // Plan kapısı: web sitesi Premium ve Elite'e ait. Freemium'da (ya da limiti
  // dolmuş bir işletmede) böyle bir adres yok — kilit ekranı değil 404.
  if (!business || !isFeatureAvailable(business, "custom_website") || !isSubscriptionActive(business)) {
    notFound();
  }

  const rich = isFeatureAvailable(business, "advanced_website");
  const { categories, products } = await getMenu(business.id);
  const content = buildSiteContent({ business, categories, products, rich });
  const { sections } = content;

  // İşletmenin kendi marka rengi ve yazı tipi — menüyle aynı kimlik.
  const brand = isValidHex(business.theme_color) ? business.theme_color! : getThemeColor(business.theme);
  const brandFill = visibleFill(brand, "#fbf5ea");
  const fontStack = getFontStack(business.font);
  const style = {
    "--brand": brandFill,
    "--brand-on": pickReadableOn(brandFill),
    "--font-body": fontStack,
    "--font-display": fontStack,
    fontFamily: fontStack,
  } as CSSProperties;

  const menuHref = `${menuUrl(business.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: business.name,
    description: business.description || undefined,
    image: business.cover_url || business.logo_url || undefined,
    telephone: business.phone || undefined,
    address: business.address || undefined,
    url: `${menuUrl(business.slug)}/site`,
    openingHours: business.working_hours || undefined,
    hasMenu: menuHref,
  };

  return (
    <SiteLocaleProvider business={business}>
      <div style={style} className="min-h-screen bg-paper text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <div className="relative">
          <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
            <SiteLanguageSwitcher dark />
          </div>
          <SiteHero content={content} rich={rich} menuHref={menuHref} />
        </div>

        <SiteAbout content={content} />

        {sections.featured && (
          <SiteSection titleKey="siteFeatured" subtitleKey="siteFeaturedSubtitle" tone="crema">
            <ProductCards products={content.featured} columns={rich ? 4 : 2} />
          </SiteSection>
        )}

        {sections.menu &&
          (rich ? (
            <SiteSection titleKey="siteMenuTitle" subtitleKey="siteMenuSubtitle">
              <MenuSlider groups={content.groups} />
            </SiteSection>
          ) : (
            <SiteSection titleKey="siteMenuTitle">
              <SiteMenuList groups={content.groups} />
            </SiteSection>
          ))}

        {rich && sections.gallery && (
          <SiteSection titleKey="siteGallery" tone="crema">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {content.gallery.map((image) => (
                <div key={image} className="aspect-square overflow-hidden rounded-2xl bg-crema">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </SiteSection>
        )}

        {sections.reservation && (
          <section className="bg-ink text-paper">
            <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
              <SiteReservationCta content={content} />
            </div>
          </section>
        )}

        {sections.location && (
          <SiteSection titleKey="locationLabel">
            <SiteLocation content={content} />
          </SiteSection>
        )}

        {sections.contact && (
          <SiteSection titleKey="siteContact" tone="crema">
            <SiteContact content={content} />
          </SiteSection>
        )}

        <SiteFooter content={content} menuHref={menuHref} />
      </div>
    </SiteLocaleProvider>
  );
}
