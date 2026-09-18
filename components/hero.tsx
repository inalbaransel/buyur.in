import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeftIcon, ClockIcon, FlameIcon, QrCodeIcon, TagIcon } from "@/components/icons";
import { DEMO_SLUG, type ShowcaseItem } from "@/lib/showcase";
import { menuHost } from "@/lib/site";

const DEMO_URL = `https://${menuHost(DEMO_SLUG)}`;
// Landing'den açılan demo ziyaretleri, demo işletmenin analizinde kampanya
// kaynağı olarak ayrışsın (hero QR'ı ile "Canlı örneği incele" ayrı ölçülür).
const DEMO_QR_URL = `${DEMO_URL}/?utm_source=buyur&utm_medium=landing&utm_campaign=hero_qr`;
const DEMO_LINK_URL = `${DEMO_URL}/?utm_source=buyur&utm_medium=landing&utm_campaign=hero_cta`;

const demoItems = [
  {
    name: "Izgara Köfte",
    desc: "El yapımı, közlenmiş biber ve pilav ile",
    price: "285₺",
    badge: "Şefin önerisi",
    time: "20 dk",
    kcal: "540 kcal",
  },
  {
    name: "Mantarlı Risotto",
    desc: "Kültür mantarı, parmesan, taze kekik",
    price: "240₺",
    badge: null,
    time: "25 dk",
    kcal: "610 kcal",
  },
  {
    name: "Mevsim Salatası",
    desc: "Roka, nar, ceviz, keçi peyniri",
    price: "165₺",
    badge: "Yeni",
    time: "10 dk",
    kcal: "320 kcal",
  },
  {
    name: "San Sebastian",
    desc: "Yanık cheesecake, dilim",
    price: "150₺",
    badge: "Popüler",
    time: "5 dk",
    kcal: "430 kcal",
  },
  {
    name: "Türk Kahvesi",
    desc: "Çifte kavrulmuş lokum eşliğinde",
    price: "70₺",
    badge: null,
    time: "8 dk",
    kcal: "45 kcal",
  },
];

function PhoneMock() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-[250px] rounded-[2.4rem] border-[6px] border-ink bg-[#171310] p-3 shadow-[0_28px_60px_-18px_rgba(35,24,18,0.45)] sm:w-[290px]"
    >
      {/* çentik */}
      <div className="absolute left-1/2 top-3 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />

      <div className="h-[480px] overflow-hidden rounded-[1.8rem] bg-[#171310] pt-8 sm:h-[520px]">
        {/* menü başlığı */}
        <div className="px-4 pb-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-paprika">alpha.buyur.in</p>
          <p className="font-display text-lg font-bold text-paper">Alpha Cafe</p>
          <div className="mt-2 flex gap-1.5 font-mono text-[9px]">
            <span className="rounded-full bg-paprika px-2.5 py-1 text-paper">Ana Yemek</span>
            <span className="rounded-full bg-paper/10 px-2.5 py-1 text-paper/60">Salatalar</span>
            <span className="rounded-full bg-paper/10 px-2.5 py-1 text-paper/60">Tatlılar</span>
          </div>
        </div>

        {/* ürün listesi — hafifçe kayarak canlı olduğunu hissettirir */}
        <div className="menu-drift space-y-2 px-4">
          {demoItems.map((item) => (
            <div key={item.name} className="rounded-lg bg-paper/[0.06] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {item.badge && (
                    <span className="mb-1 inline-block rounded bg-paprika/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-paprika">
                      {item.badge}
                    </span>
                  )}
                  <p className="text-[13px] font-semibold text-paper">{item.name}</p>
                  <p className="text-[10px] leading-snug text-paper/50">{item.desc}</p>
                </div>
                <span className="font-mono text-[13px] font-medium text-paper">{item.price}</span>
              </div>
              <div className="mt-2 flex gap-3 font-mono text-[9px] text-paper/40">
                <span className="flex items-center gap-1">
                  <ClockIcon size={10} /> {item.time}
                </span>
                <span className="flex items-center gap-1">
                  <FlameIcon size={10} /> {item.kcal}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* sepet çubuğu */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-paprika px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-paper">Sepet · 2 ürün</span>
          <span className="font-mono text-sm font-bold text-paper">450₺</span>
        </div>
      </div>
    </div>
  );
}

// Hero altında sonsuz kayan şerit — yalnızca ürünün bugün yaptığı işler.
const marqueeItems = [
  "Baskı maliyeti yok",
  "Anlık fiyat güncelleme",
  "QR kod hazır",
  "Uygulama indirme yok",
  "Kalori & alerjen bilgisi",
  "TR · EN · AR · RU menü",
  "Sepet → garsona göster",
  "Ürün ve QR analizi",
];

/** Taranabilir, gerçek demo menü QR'ı — sunucuda üretilir (vektör, net baskı). */
async function demoQrDataUrl(): Promise<string | null> {
  try {
    const svg = await QRCode.toString(DEMO_QR_URL, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#231812", light: "#ffffff" },
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}

/** Uydurma sayı yerine doğrulanabilir kanıt: canlı menüye tek tık. Kart
 *  verisi (kategori/ürün/dil sayısı) o menünün kendisinden okunuyor. */
function ProofLink({ proof }: { proof: ShowcaseItem | null }) {
  const label = proof?.kind === "customer" ? "Canlı müşteri menüsü" : "Canlı demo menü";
  const hasCounts = proof !== null && proof.products > 0;

  return (
    <a
      href={DEMO_LINK_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-track="live_demo_open"
      data-track-location="hero_proof"
      className="group mt-9 flex w-full items-center gap-4 rounded-2xl border border-line bg-paper/80 p-3 pr-5 backdrop-blur transition-colors hover:border-paprika sm:w-fit"
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-crema font-display text-lg font-extrabold text-paprika">
        {proof?.logoUrl ? (
          <picture>
            <img src={proof.logoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
        ) : (
          (proof?.name ?? "M").charAt(0)
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-herb">● {label}</span>
        <span className="block font-display text-base font-bold leading-tight">
          {proof ? `${proof.name} menüsünü incele` : "Demo menüyü canlı incele"}
        </span>
        {hasCounts && (
          <span className="block text-xs text-ink-soft">
            {proof.categories} kategori · {proof.products} ürün · {proof.languages} dil
          </span>
        )}
      </span>
      <ArrowLeftIcon
        size={16}
        className="ml-auto shrink-0 rotate-180 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-paprika"
      />
    </a>
  );
}

export async function Hero({ proof }: { proof: ShowcaseItem | null }) {
  const qr = await demoQrDataUrl();

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Arka plan: sıcak ışık lekeleri + ince ızgara */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob-drift absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-paprika/[0.13] blur-3xl" />
          <div
            className="blob-drift absolute -right-32 top-32 h-[30rem] w-[30rem] rounded-full bg-herb/[0.10] blur-3xl"
            style={{ animationDelay: "-6s" }}
          />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 75%)",
            }}
          />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 md:grid-cols-[1.15fr_0.85fr] md:pt-20">
          <div>
            <h1 className="rise rise-2 mt-6 font-display text-[2.35rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-[3.5rem]">
              Menünüzü{" "}
              <span className="relative inline-block text-paprika">
                güncel
                <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden>
                  <path
                    className="stroke-draw"
                    d="M3 9C60 3 140 3 197 7"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              tutun, müşterinin seçimini kolaylaştırın.
            </h1>

            <p className="rise rise-3 mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              buyur ile QR menünüzü dakikalar içinde kurun; fiyatları anında değiştirin, ürünleri öne çıkarın ve
              müşterinin seçimlerini garsona eksiksiz göstermesini sağlayın.
            </p>

            <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/panel/register"
                data-track="cta_click"
                data-track-location="hero"
                data-track-cta="create_free"
                className="shine-on-hover relative overflow-hidden rounded-md bg-paprika px-8 py-4 text-center font-mono text-sm uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-paprika-deep hover:shadow-[0_16px_34px_-12px_rgba(232,73,31,0.85)]"
              >
                Ücretsiz menünü oluştur
              </Link>
              <a
                href={DEMO_LINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-track="live_demo_open"
                data-track-location="hero"
                className="rounded-md border border-ink/20 px-8 py-4 text-center font-mono text-sm uppercase tracking-wider text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-paper"
              >
                Canlı örneği incele
              </a>
            </div>

            <p className="rise rise-4 mt-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft/80">
              Kredi kartı yok · 5 dakikada kurulum · İstediğin an bırak
            </p>

            <div className="rise rise-5">
              <ProofLink proof={proof} />
            </div>
          </div>

          {/* Telefon + etrafında süzülen kartlar.
              Kartlar telefonun kendi genişliğine göre konumlanır (kolona göre
              değil), yoksa geniş kolonda ortalanan telefonun başlığını örterler.
              Yalnızca lg'de görünürler: dar ekranda taşacak kadar yer yok ve
              telefondaki QR'ı zaten o telefonla taramak mümkün değil. */}
          <div className="rise rise-4">
            <div className="relative mx-auto w-[250px] sm:w-[290px]">
              <div className="float-y">
                <PhoneMock />
              </div>

              {/* Anlık güncelleme rozeti — ürünün ne yaptığını gösterir, sonuç iddia etmez */}
              <div className="float-y-slow absolute left-0 top-40 hidden w-max -translate-x-[55%] items-center gap-2.5 rounded-2xl border border-line bg-paper/95 px-3.5 py-2.5 shadow-[0_18px_40px_-18px_rgba(35,24,18,0.4)] backdrop-blur lg:flex">
                <span className="rounded-lg bg-herb/12 p-1.5 text-herb">
                  <TagIcon size={16} />
                </span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-ink-soft">Az önce · tüm masalarda</p>
                  <p className="font-display text-sm font-bold">Fiyat güncellendi</p>
                </div>
              </div>

              {/* Gerçekten taranabilir ve tıklanabilir QR — canlı demo menüyü açar */}
              <a
                href={DEMO_QR_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-track="live_demo_open"
                data-track-location="hero_qr"
                className="float-y-slow absolute bottom-20 right-0 hidden w-max translate-x-[30%] items-center gap-3 rounded-2xl border border-line bg-paper p-3 shadow-[0_18px_40px_-18px_rgba(35,24,18,0.4)] transition-colors hover:border-paprika lg:flex"
                style={{ animationDelay: "-3s" }}
              >
                {qr ? (
                  <picture>
                    <img src={qr} alt="Canlı demo menünün QR kodu" width={84} height={84} className="rounded" />
                  </picture>
                ) : (
                  <QrCodeIcon size={44} className="text-ink" />
                )}
                <p className="max-w-[112px] font-mono text-[10px] leading-snug text-ink-soft">
                  <QrCodeIcon size={12} className="mb-1 text-paprika" />
                  Telefonunla tara ya da tıkla: menü canlı açılır
                </p>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Kayan değer şeridi */}
      <div className="marquee-mask overflow-hidden border-y border-line bg-crema/50 py-3.5">
        <div className="marquee-track flex w-max gap-8">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 gap-8" aria-hidden={dup === 1}>
              {marqueeItems.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-8 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-ink-soft"
                >
                  {item}
                  <span className="text-paprika">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
