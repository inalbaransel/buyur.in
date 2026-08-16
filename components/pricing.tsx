import Link from "next/link";
import { whatsappLink } from "@/lib/site";
import { CheckCircleIcon, WhatsappIcon } from "@/components/icons";
import { PlanGrid } from "@/components/pricing-plans";
import { FEATURE_MATRIX, PLAN_LABELS, PLAN_ORDER } from "@/lib/entitlements";
import type { PlanRecord } from "@/lib/types";

export function Pricing({ plans }: { plans: PlanRecord[] }) {
  return (
    <section id="fiyat" className="mx-auto max-w-6xl px-5 py-24">
      <p className="text-center font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">
        Hesap lütfen
      </p>
      <h2 className="mt-3 text-center font-display text-4xl font-extrabold tracking-tight md:text-5xl">
        Baskı maliyetinden ucuz
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-ink-soft">
        Bir kez menü bastırmanın parasıyla aylarca dijital kalın. Ücretsiz
        başlayın, işinize yaradığında devam edin.
      </p>

      <PlanGrid plans={plans} />

      <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-line bg-crema/40 px-5 py-4 text-center text-sm text-ink-soft">
        <span className="font-semibold text-ink">Freemium: 3 ay veya 10.000 menü görüntülenmesine kadar ücretsiz.</span>{" "}
        İki limitten hangisi önce dolarsa Freemium kullanım süresi sona erer. Premium ve Elite planlarında ne süre
        sınırı ne de görüntülenme sınırı vardır.
      </p>

      <PlanComparison />

      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-wider text-ink-soft/70">
        Ücretsiz planda kredi kartı istemiyoruz · İstediğiniz an bırakabilirsiniz
      </p>
    </section>
  );
}

/** Plan karşılaştırması — panelle aynı kaynaktan (lib/entitlements.ts). */
function PlanComparison() {
  return (
    <div className="mt-10 overflow-x-auto rounded-2xl border border-line bg-paper">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-line bg-crema/50 text-left">
            <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-soft">Özellik</th>
            {PLAN_ORDER.map((plan) => (
              <th key={plan} className="px-5 py-3 text-center font-display text-base font-bold">
                {PLAN_LABELS[plan]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map((row) => (
            <tr key={row.label} className="border-b border-line/60 last:border-0">
              <td className="px-5 py-3">{row.label}</td>
              {PLAN_ORDER.map((plan) => {
                const value = row.values[plan];
                return (
                  <td key={plan} className="px-5 py-3 text-center">
                    {typeof value === "string" ? (
                      <span className="font-mono text-[12px] uppercase tracking-wider">{value}</span>
                    ) : value ? (
                      <span className="inline-flex text-herb" aria-label="var">
                        <CheckCircleIcon size={16} />
                      </span>
                    ) : (
                      <span className="text-ink-soft/40" aria-label="yok">
                        —
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const faqs = [
  {
    q: "Freemium ne kadar süre ücretsiz?",
    a: "Freemium plan 3 ay veya 10.000 menü görüntülenmesine kadar ücretsizdir. Bu iki limitten hangisi önce dolarsa Freemium sona erer. Kredi kartı istemiyoruz.",
  },
  {
    q: "Premium'da menü görüntülenme sınırı var mı?",
    a: "Hayır. Premium plan sınırsız menü görüntülenmesi sunar ve süre sınırı yoktur.",
  },
  {
    q: "Elite'de menü görüntülenme sınırı var mı?",
    a: "Hayır. Elite planında da menü görüntülenme sınırı ve süre sınırı yoktur.",
  },
  {
    q: "Custom Website hangi planlarda var?",
    a: "Premium ve Elite planlarında otomatik oluşturulan Custom Website bulunur. Panelde girdiğiniz bilgilerden (menü, görseller, çalışma saatleri, konum, iletişim) site kendiliğinden oluşur; ayrıca içerik girmeniz gerekmez.",
  },
  {
    q: "Premium ve Elite arasındaki fark nedir?",
    a: "Premium profesyonel bir Custom Website ve gelişmiş analizler sunar. Elite ise daha gelişmiş bir website deneyimi (animasyonlu tanıtım, menü slider'ı, galeri) ile gelişmiş raporlama ve PDF/Excel/CSV dışa aktarma ekler.",
  },
  {
    q: "Freemium süresi dolunca verilerim silinir mi?",
    a: "Hayır. Menünüz, ürünleriniz, görselleriniz ve analiz geçmişiniz olduğu gibi kalır. Yalnızca menünüzün yayını ve gelişmiş özellikler durur; bir plana geçtiğinizde her şey kaldığı yerden devam eder.",
  },
  {
    q: "Teknik bilgim yok, kullanabilir miyim?",
    a: "Kesinlikle. menuva, telefon kullanabilen herkes için tasarlandı. Ürün eklemek fotoğraf paylaşmak kadar kolay. Takıldığınız yerde WhatsApp'tan yazın, birlikte kuralım.",
  },
  {
    q: "Fiyat değiştirdiğimde müşteri ne zaman görür?",
    a: "Anında. Kaydet dediğiniz saniyede, açık olan tüm menülerde yeni fiyat görünür. Baskı beklemek yok.",
  },
  {
    q: "QR kodu nasıl alacağım?",
    a: "Kayıt olduğunuzda otomatik oluşur. Panelden yüksek çözünürlüklü indirir, dilediğiniz boyutta bastırırsınız. Masa, vitrin ve sosyal medya için ayrı QR'lar oluşturup hangisinin daha çok tarandığını görebilirsiniz.",
  },
  {
    q: "Analizler tam olarak neyi gösteriyor?",
    a: "Menünüzün kaç kez açıldığını, hangi ürünlerin en çok incelendiğini, müşterinin menüde ne kadar kaldığını ve trafiğin nereden geldiğini. Yani neyi öne çıkaracağınıza tahminle değil veriyle karar verirsiniz.",
  },
  {
    q: "Aylık mı yıllık mı ödemeliyim?",
    a: "İkisi de mümkün. Yıllık ödemede aylık maliyet %20 düşüyor: Premium ayda 250₺ yerine 200₺ (yıllık 2.400₺), Elite ayda 500₺ yerine 400₺ (yıllık 4.800₺). Aylık ödemede taahhüt yok.",
  },
];

export function FAQ() {
  return (
    <section className="border-t border-line bg-crema/40">
      <div className="mx-auto max-w-3xl px-5 py-24">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight">
          Sık sorulanlar
        </h2>
        <div className="mt-10 divide-y divide-line">
          {faqs.map((f) => (
            <details key={f.q} data-reveal className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold transition-colors hover:text-paprika">
                {f.q}
                <span
                  className="shrink-0 text-xl text-paprika transition-transform duration-300 group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-paper p-8 text-center">
          <p className="font-display text-xl font-bold">Sorunuz listede yok mu?</p>
          <p className="max-w-md text-sm text-ink-soft">
            Yazın, gerçek bir insan cevaplasın. Satış konuşması değil — sadece
            merak ettiğinizi öğrenin.
          </p>
          <a
            href={whatsappLink("Merhaba, menuva hakkında bir sorum var:")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-ink px-6 py-3 font-mono text-[13px] uppercase tracking-wider transition-colors hover:bg-ink hover:text-paper"
          >
            <WhatsappIcon size={15} />
            WhatsApp'tan sorun
          </a>
        </div>
      </div>
    </section>
  );
}

// Kapanış CTA'sı herkese hitap etmeli: tek bir "restoran sahibi" tipi
// yok — mahalle kafesi de, zincir de, food truck da aynı yerden başlıyor.
const audiences = [
  "Kafeler",
  "Restoranlar",
  "Pastaneler",
  "Barlar",
  "Food truck'lar",
  "Oteller",
  "Kahvaltı salonları",
  "Bulut mutfaklar",
];

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-paprika">
      {/* Zeminde yavaşça sürüklenen sıcak ışık */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob-drift absolute -left-20 -top-32 h-[28rem] w-[28rem] rounded-full bg-paper/10 blur-3xl" />
        <div
          className="blob-drift absolute -bottom-40 -right-20 h-[26rem] w-[26rem] rounded-full bg-ink/10 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
      </div>

      <div
        data-reveal
        className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-5 py-24 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70">
          Beş dakika sonrası
        </p>

        <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-paper md:text-5xl">
          Menünüz bu akşam yayında olabilir.
        </h2>

        <p className="max-w-lg leading-relaxed text-paper/80">
          İster tek şubeli mahalle kafesi olun, ister onlarca masalı bir
          restoran — kurulum aynı: hesabı açın, ürünleri girin, QR'ı masaya
          koyun. Baskı yok, sözleşme yok, kredi kartı yok.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/panel/register"
            className="shine-on-hover relative overflow-hidden rounded-full bg-ink px-9 py-4 text-center font-mono text-sm uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(35,24,18,0.7)]"
          >
            Ücretsiz başla
          </Link>
          <a
            href={whatsappLink("Merhaba, menuva hakkında bilgi almak istiyorum.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-paper/40 px-9 py-4 text-center font-mono text-sm uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:border-paper hover:bg-paper hover:text-paprika"
          >
            <WhatsappIcon size={15} />
            Önce konuşalım
          </a>
        </div>

        {/* Kimler kullanıyor — kayan şerit */}
        <div className="marquee-mask mt-6 w-full overflow-hidden">
          <div className="marquee-track flex w-max gap-3">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 gap-3" aria-hidden={dup === 1}>
                {audiences.map((a) => (
                  <span
                    key={a}
                    className="whitespace-nowrap rounded-full border border-paper/25 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-paper/80"
                  >
                    {a}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
