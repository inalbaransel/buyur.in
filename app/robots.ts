import type { MetadataRoute } from "next";
import { ROOT_DOMAIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel", "/panel/", "/api/"],
      },
    ],
    sitemap: `https://${ROOT_DOMAIN}/sitemap.xml`,
    host: `https://${ROOT_DOMAIN}`,
  };
}
