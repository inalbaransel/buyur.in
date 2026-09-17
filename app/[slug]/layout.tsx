import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerPB } from "@/lib/pocketbase";
import { MenuProvider } from "@/components/menu/menu-provider";
import { MenuUnavailable } from "@/app/[slug]/unavailable";
import { isSubscriptionActive } from "@/lib/entitlements";
import { menuUrl } from "@/lib/site";
import { SITE_NAME, shareImages } from "@/lib/seo";
import type { Business, Category, Popup, Product } from "@/lib/types";

const getBusiness = cache(async (slug: string): Promise<Business | null> => {
  const pb = createServerPB();
  try {
    return await pb
      .collection("buyur_businesses")
      .getFirstListItem<Business>(pb.filter("slug = {:slug} && is_active = true", { slug }));
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return {};

  const title = `${business.name} — Menü | buyur`;
  const description = business.description || `${business.name} dijital menüsü — güncel fiyatlar, kategoriler ve ürünler.`;
  // Kapak yoksa markalı paylaşım görseli: WhatsApp'ta paylaşılan menü linki
  // hiçbir koşulda görselsiz kalmasın.
  const images = shareImages(business.cover_url);

  // Not: canonical burada verilemez — layout metadata'sı alt sayfalara
  // (ürün, kategori, sepet) da miras kalır ve hepsini menü köküne eşitler.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: menuUrl(business.slug),
      siteName: SITE_NAME,
      images,
      locale: "tr_TR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    icons: business.logo_url ? { icon: business.logo_url } : undefined,
  };
}

export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  // Freemium limiti (3 ay VEYA 10.000 görüntülenme) dolduysa menü yayından
  // kalkar — veri silinmez, sahibi plana geçtiğinde aynen geri gelir.
  if (!isSubscriptionActive(business)) {
    return <MenuUnavailable business={business} />;
  }

  // Subdomain üzerinden gelindiyse (vezirhan.buyur.in) linklerde slug öneki
  // kullanılmaz; path üzerinden gelindiyse (/vezirhan) eski davranış korunur.
  const hdrs = await headers();
  const basePath = hdrs.get("x-buyur-rewrite") === "subdomain" ? "" : `/${business.slug}`;

  // Menü verisi sunucuda çekiliyor: daha önce tarayıcı açıldıktan sonra iki ek
  // istek atıp bekliyordu. Artık ilk boyamada menü hazır geliyor.
  const pb = createServerPB();
  const [popups, categories, products] = await Promise.all([
    pb.collection("buyur_popups").getFullList<Popup>({
      filter: pb.filter("business = {:id} && is_active = true", { id: business.id }),
      sort: "-created",
      requestKey: null,
    }),
    pb.collection("buyur_categories").getFullList<Category>({
      filter: pb.filter("business = {:id} && is_active = true", { id: business.id }),
      sort: "order,created",
      requestKey: null,
    }),
    pb.collection("buyur_products").getFullList<Product>({
      filter: pb.filter("business = {:id} && is_available = true", { id: business.id }),
      sort: "order,created",
      requestKey: null,
    }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: business.name,
    description: business.description || undefined,
    image: business.cover_url || business.logo_url || undefined,
    telephone: business.phone || undefined,
    address: business.address || undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MenuProvider
        business={business}
        popup={popups[0] ?? null}
        basePath={basePath}
        initialCategories={categories}
        initialProducts={products}
      >
        {children}
      </MenuProvider>
    </>
  );
}
