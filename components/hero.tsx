import Link from "next/link";
import { ClockIcon, FlameIcon, QrCodeIcon, TrendingUpIcon } from "@/components/icons";
import { whatsappLink } from "@/lib/site";

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
          <p className="font-mono text-[9px] uppercase tracking-widest text-paprika">
            alpha.menuvaapp.com
          </p>
          <p className="font-display text-lg font-bold text-paper">
            Alpha Cafe
          </p>
          <div className="mt-2 flex gap-1.5 font-mono text-[9px]">
            <span className="rounded-full bg-paprika px-2.5 py-1 text-paper">
              Ana Yemek
            </span>
            <span className="rounded-full bg-paper/10 px-2.5 py-1 text-paper/60">
              Salatalar
            </span>
            <span className="rounded-full bg-paper/10 px-2.5 py-1 text-paper/60">
              Tatlılar
            </span>
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
                  <p className="text-[13px] font-semibold text-paper">
                    {item.name}
                  </p>
                  <p className="text-[10px] leading-snug text-paper/50">
                    {item.desc}
                  </p>
                </div>
                <span className="font-mono text-[13px] font-medium text-paper">
                  {item.price}
                </span>
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
          <span className="font-mono text-[10px] uppercase tracking-wider text-paper">
            Sepet · 2 ürün
          </span>
          <span className="font-mono text-sm font-bold text-paper">450₺</span>
        </div>
      </div>
    </div>
  );
}

const trustStats = [
  { value: "5 dk", label: "kurulum süresi" },
  { value: "0₺", label: "başlangıç maliyeti" },
  { value: "∞", label: "güncelleme hakkı" },
];

// Hero altında sonsuz kayan şerit — sayfaya sürekli bir hareket verir.
const marqueeItems = [
  "Baskı maliyeti yok",
  "Anlık fiyat güncelleme",
  "QR kod hazır",
  "Uygulama indirme yok",
  "Kalori & alerjen bilgisi",
  "Çoklu dil desteği",
  "Sipariş sepeti",
  "Detaylı analizler",
];

export function Hero() {
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
              maskImage:
                "radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 75%)",
            }}
          />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
          <div>
            <h1 className="rise rise-2 mt-5 font-display text-[2.65rem] font-extrabold leading-[1.03] tracking-tight sm:text-5xl md:text-[4.2rem]">
              Kâğıt menü devri{" "}
              <span className="relative inline-block text-paprika">
                kapandı.
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  aria-hidden
                >
                  <path
                    className="stroke-draw"
                    d="M3 9C60 3 140 3 197 7"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="rise rise-3 mt-7 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
              Menünüzü dakikalar içinde dijitalleştirin. Fiyat güncelleyin,
              kampanya ekleyin, QR kodla paylaşın. Baskı maliyeti yok, bekleme
              yok — değişiklikleriniz anında her masada.
            </p>

            <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/panel/register"
                className="shine-on-hover relative overflow-hidden rounded-full bg-paprika px-8 py-4 text-center font-mono text-sm uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-paprika-deep hover:shadow-[0_16px_34px_-12px_rgba(232,73,31,0.85)]"
              >
                Ücretsiz başla
              </Link>
              <a
                href={whatsappLink("Merhaba, menuva demosunu görmek istiyorum.")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-ink/20 px-8 py-4 text-center font-mono text-sm uppercase tracking-wider text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-ink hover:bg-ink hover:text-paper"
              >
                Demo isteyin
              </a>
            </div>

            <p className="rise rise-4 mt-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft/70">
              Kredi kartı gerekmez · Kurulum ücreti yok
            </p>

            {/* Güven satırı */}
            <div className="rise rise-5 mt-9 flex items-center gap-7 border-t border-line pt-7 sm:gap-10">
              {trustStats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {s.value}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    {s.label}
                  </p>
                </div>
              ))}
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

              {/* Canlı analiz rozeti — sol kenardan sarkar, ürün listesi hizasında */}
              <div className="float-y-slow absolute left-0 top-40 hidden w-max -translate-x-[55%] items-center gap-2.5 rounded-2xl border border-line bg-paper/95 px-3.5 py-2.5 shadow-[0_18px_40px_-18px_rgba(35,24,18,0.4)] backdrop-blur lg:flex">
                <span className="rounded-lg bg-herb/12 p-1.5 text-herb">
                  <TrendingUpIcon size={16} />
                </span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-ink-soft">
                    Bu hafta
                  </p>
                  <p className="font-display text-sm font-bold">+%38 görüntülenme</p>
                </div>
              </div>

              {/* QR kartı — sağ kenarda, sepet çubuğunun üstünde kalacak yükseklikte */}
              <div
                className="float-y-slow absolute bottom-24 right-0 hidden w-max translate-x-[25%] items-center gap-3 rounded-2xl border border-line bg-paper/95 p-3 shadow-[0_18px_40px_-18px_rgba(35,24,18,0.4)] backdrop-blur lg:flex"
                style={{ animationDelay: "-3s" }}
              >
                <picture>
                  <img
                    src="/demo-qr.svg"
                    alt="Demo menü QR kodu"
                    width={52}
                    height={52}
                    className="rounded"
                  />
                </picture>
                <p className="max-w-[104px] font-mono text-[10px] leading-snug text-ink-soft">
                  <QrCodeIcon size={12} className="mb-1 text-paprika" />
                  Tara, demo menüyü canlı gör
                </p>
              </div>
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
