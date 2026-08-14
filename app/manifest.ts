import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "menuva — Dijital QR Menü",
    short_name: "menuva",
    description:
      "Restoranlar ve kafeler için dijital QR menü platformu. Menünüzü dakikalar içinde dijitalleştirin.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf5ea",
    theme_color: "#e8491f",
    lang: "tr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
