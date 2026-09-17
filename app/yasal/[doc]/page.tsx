import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/chrome";
import { LegalDocView } from "@/components/legal-doc";
import { LEGAL_DOCS, legalDoc, legalPath } from "@/lib/legal";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

// Altı metnin tamamı build sırasında statik üretilir; yasal sayfa hiçbir koşulda
// veritabanına ya da ağa bağlı olmasın (ödeme sağlayıcıları bu adreslerin her
// zaman açılmasını bekler).
export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc: doc.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc: slug } = await params;
  const doc = legalDoc(slug);
  if (!doc) return {};

  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: legalPath(doc.slug) },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc: slug } = await params;
  const doc = legalDoc(slug);
  if (!doc) notFound();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Yasal metinler", path: "/yasal" },
    { name: doc.title, path: legalPath(doc.slug) },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbs)} />
      <Navbar />
      <main>
        <LegalDocView doc={doc} />
      </main>
      <Footer />
    </>
  );
}
