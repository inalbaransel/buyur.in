import Image from "next/image";
import Link from "next/link";
import { whatsappLink } from "@/lib/site";
import { LEGAL_DOCS, legalPath } from "@/lib/legal";
import { WhatsappIcon } from "@/components/icons";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/buyur-icon.png"
        alt=""
        width={32}
        height={32}
        className="h-7 w-7 sm:h-8 sm:w-8"
        priority={!light}
      />
      <span
        className={`font-display text-2xl font-extrabold tracking-tight ${light ? "text-paper" : "text-ink"
          }`}
      >
        buyur<span className="text-paprika">.</span>in
      </span>
    </span>
  );
}

const footerNav = [
  {
    title: "Ürün",
    links: [
      { label: "Neden buyur", href: "/#neden" },
      { label: "Canlı demo", href: "/#canli-menu" },
      { label: "Nasıl çalışır", href: "/#nasil" },
      { label: "Fiyatlar", href: "/#fiyat" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Hesap",
    links: [
      { label: "Ücretsiz başla", href: "/panel/register" },
      { label: "Giriş yap", href: "/panel/login" },
      { label: "Panel", href: "/panel" },
    ],
  },
  {
    title: "İletişim",
    links: [
      { label: "merhaba@buyur.in", href: "mailto:merhaba@buyur.in" },
      {
        label: "WhatsApp destek",
        href: whatsappLink("Merhaba, buyur hakkında bilgi almak istiyorum."),
      },
    ],
  },
  {
    // Yasal metinlerin listesi lib/legal.ts'ten geliyor: yeni bir metin
    // eklendiğinde footer kendiliğinden güncellenir.
    title: "Yasal",
    links: LEGAL_DOCS.map((doc) => ({ label: doc.navLabel, href: legalPath(doc.slug) })),
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink text-paper/60">
      {/* Üst kenarda ince marka çizgisi */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-paprika to-transparent" />

      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm space-y-5">
            <Logo light />
            <p className="text-sm leading-relaxed">
              Restoranlar ve kafeler için dijital QR menü platformu. Menünü bir
              kez kur, her masada güncel kalsın.
            </p>
            <a
              href={whatsappLink("Merhaba, buyur hakkında bilgi almak istiyorum.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2.5 font-mono text-[12px] uppercase tracking-wider text-paper/80 transition-colors hover:border-paprika hover:bg-paprika hover:text-paper"
            >
              <WhatsappIcon size={15} />
              Bize yazın
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="font-mono text-[12px] uppercase tracking-wider text-paper">
                  {col.title}
                </span>
                {col.links.map((l) =>
                  l.href.startsWith("http") ? (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm transition-colors hover:text-paprika"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      key={l.label}
                      href={l.href}
                      className="text-sm transition-colors hover:text-paprika"
                    >
                      {l.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-6 text-center font-mono text-xs text-paper/45 sm:flex-row sm:justify-between sm:text-left">
          <p>© {year} buyur· Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1.5">
            <span className="text-paprika" aria-hidden>
              ❤
            </span>
            <span>
              <span className="font-semibold text-paper/70">Harbi</span>{" "}
              tarafından tasarlandı ve geliştirildi
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
