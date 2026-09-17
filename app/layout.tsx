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
import {
  OG_IMAGE,
  SHARE_DESCRIPTION,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  jsonLdScript,
  siteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "business",
  referrer: "origin-when-cross-origin",
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
    siteName: SITE_NAME,
    locale: "tr_TR",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  // Menü ekrana eklendiğinde tam ekran açılsın, adres çubuğu marka rengini alsın.
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  // Search Console doğrulaması ortam değişkeniyle verilir; yoksa etiket basılmaz.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
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
      <head>
        {/* Kurum + site kimliği: arama motorları site adını ve logoyu buradan okur. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(siteJsonLd())} />
      </head>
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
