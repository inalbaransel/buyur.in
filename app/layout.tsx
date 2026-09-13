import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "@fontsource-variable/jetbrains-mono";
// Menü uygulamasında işletme bazında seçilebilen fontlar (lib/fonts.ts).
import "@fontsource-variable/inter";
import "@fontsource-variable/nunito";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/lora";
import "@fontsource-variable/playfair-display";
import "./globals.css";
import { AuthProvider } from "@/lib/use-auth";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ROOT_DOMAIN } from "@/lib/site";

const SITE_URL = `https://${ROOT_DOMAIN}`;
const SITE_TITLE = "menuva — Dijital QR Menü";
const SITE_DESCRIPTION =
  "Restoran, kafe, pastane ve oteller için QR menü. Menünüzü dakikalar içinde kurun, fiyatları anında değiştirin, ürünleri öne çıkarın ve müşterinin seçimini garsona eksiksiz gösterin.";
const SHARE_DESCRIPTION = "Menünüzü güncel tutun, müşterinin seçimini kolaylaştırın. Kredi kartı yok, 5 dakikada kurulum.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | menuva",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "qr menü",
    "dijital menü",
    "restoran menü",
    "kafe menü",
    "online menü",
    "qr kod menü",
    "menü oluşturma",
    "restoran yönetim yazılımı",
  ],
  applicationName: "menuva",
  authors: [{ name: "menuva" }],
  creator: "menuva",
  publisher: "menuva",
  category: "business",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SHARE_DESCRIPTION,
    url: SITE_URL,
    siteName: "menuva",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SHARE_DESCRIPTION,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#e8491f",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ScrollReveal />
        <Analytics />
      </body>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-85G8D20Q8V" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-85G8D20Q8V');`}
      </Script>
    </html>
  );
}
