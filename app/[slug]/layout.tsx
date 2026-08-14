import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerPB } from "@/lib/pocketbase";
import { MenuProvider } from "@/components/menu/menu-provider";
import { menuUrl } from "@/lib/site";
import type { Business, Popup } from "@/lib/types";

const getBusiness = cache(async (slug: string): Promise<Business | null> => {
  const pb = createServerPB();
  try {
    return await pb
      .collection("menuva_businesses")
      .getFirstListItem<Business>(pb.filter("slug = {:slug} && is_active = true", { slug }));
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return {};

  const title = `${business.name} — Menü | menuva`;
  const description = business.description || `${business.name} dijital menüsü — güncel fiyatlar, kategoriler ve ürünler.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: menuUrl(business.slug),
      siteName: "menuva",
      images: business.cover_url ? [business.cover_url] : undefined,
      locale: "tr_TR",
      type: "website",
    },
    twitter: {
      card: business.cover_url ? "summary_large_image" : "summary",
      title,
      description,
      images: business.cover_url ? [business.cover_url] : undefined,
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

  // Subdomain üzerinden gelindiyse (vezirhan.menuvaapp.com) linklerde slug öneki
  // kullanılmaz; path üzerinden gelindiyse (/vezirhan) eski davranış korunur.
  const hdrs = await headers();
  const basePath = hdrs.get("x-menuva-rewrite") === "subdomain" ? "" : `/${business.slug}`;

  const pb = createServerPB();
  const popups = await pb.collection("menuva_popups").getFullList<Popup>({
    filter: pb.filter("business = {:id} && is_active = true", { id: business.id }),
    sort: "-created",
  });

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
      <MenuProvider business={business} popup={popups[0] ?? null} basePath={basePath}>
        {children}
      </MenuProvider>
    </>
  );
}
