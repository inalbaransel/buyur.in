import type { MetadataRoute } from "next";
import { createServerPB } from "@/lib/pocketbase";
import { ROOT_DOMAIN, menuHost } from "@/lib/site";

async function getActiveBusinessUrls(): Promise<MetadataRoute.Sitemap> {
  const pb = createServerPB();
  try {
    const businesses = await pb.collection("menuva_businesses").getFullList<{
      slug: string;
      updated: string;
    }>({
      filter: "is_active = true",
      fields: "slug,updated",
      requestKey: null,
    });

    return businesses.map((business) => ({
      url: `https://${menuHost(business.slug)}`,
      lastModified: business.updated,
      changeFrequency: "daily",
      priority: 0.7,
    }));
  } catch {
    // PocketBase'e ulaşılamıyorsa sitemap yalnızca statik sayfalarla döner.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const businessUrls = await getActiveBusinessUrls();

  return [
    {
      url: `https://${ROOT_DOMAIN}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...businessUrls,
  ];
}
