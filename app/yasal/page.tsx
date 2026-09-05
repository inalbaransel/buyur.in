import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/chrome";
import { LEGAL_DOCS, formatLegalDate, legalPath } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Yasal metinler",
  description:
    "menuva'nın gizlilik politikası, KVKK aydınlatma metni, kullanım koşulları, abonelik ve iptal koşulları, ödeme koşulları ve faturalandırma bilgileri.",
  alternates: { canonical: "/yasal" },
};

export default function LegalIndexPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Yasal metinler</h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Hizmeti kullanırken geçerli olan koşulların tamamı burada. Sade Türkçe yazmaya çalıştık; anlaşılmayan
          bir madde olursa yazın, açıklayalım.
        </p>

        <ul className="mt-10 divide-y divide-line border-y border-line">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link href={legalPath(doc.slug)} className="group flex flex-col gap-1 py-5 transition-colors">
                <span className="font-display text-lg font-bold transition-colors group-hover:text-paprika">
                  {doc.title}
                </span>
                <span className="text-sm leading-relaxed text-ink-soft">{doc.summary}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft/70">
                  Yürürlük: {formatLegalDate(doc.updated)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
