import type { MetadataRoute } from "next";
import { createServerPB } from "@/lib/pocketbase";
import { ROOT_DOMAIN, menuHost } from "@/lib/site";
import { LEGAL_DOCS, legalPath } from "@/lib/legal";
import { listPosts } from "@/lib/blog";

async function getActiveBusinessUrls(): Promise<MetadataRoute.Sitemap> {
  const pb = createServerPB();
  try {
    const businesses = await pb.collection("buyur_businesses").getFullList<{
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

/** Yasal metinler: ödeme sağlayıcıları ve arama motorları bu adresleri bulabilsin. */
function legalUrls(): MetadataRoute.Sitemap {
  return [
    { url: `https://${ROOT_DOMAIN}/yasal`, changeFrequency: "yearly", priority: 0.3 },
    ...LEGAL_DOCS.map((doc) => ({
      url: `https://${ROOT_DOMAIN}${legalPath(doc.slug)}`,
      lastModified: new Date(doc.updated),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}

/** Blog: liste sayfası + yayındaki yazılar (koleksiyon yoksa yalnızca liste). */
async function blogUrls(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPosts(500);
  return [
    { url: `https://${ROOT_DOMAIN}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((post) => ({
      url: `https://${ROOT_DOMAIN}/blog/${post.slug}`,
      lastModified: post.updated || post.published_at,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [businessUrls, blog] = await Promise.all([getActiveBusinessUrls(), blogUrls()]);

  return [
    {
      url: `https://${ROOT_DOMAIN}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...blog,
    ...legalUrls(),
    ...businessUrls,
  ];
}
