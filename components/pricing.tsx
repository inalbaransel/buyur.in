import Link from "next/link";
import { whatsappLink } from "@/lib/site";
import { CheckCircleIcon, WhatsappIcon } from "@/components/icons";
import { PlanGrid } from "@/components/pricing-plans";
import { PLAN_LABELS, PLAN_ORDER, featureMatrix, freemiumLimits } from "@/lib/entitlements";
import { loadedPlanRecords } from "@/lib/plan-catalog-loader";
import type { Plan } from "@/lib/types";
import type { PlanText } from "@/components/pricing-plans";
import { MONTHS_IN_YEAR, formatTL, planPricing, yearlyDiscountPercent } from "@/lib/pricing";

export function Pricing() {
  const freemium = freemiumLimits();
  const texts = loadedPlanRecords().map((record) => ({
    key: record.key,
    name: record.name,
    description: record.description,
    features: Array.isArray(record.features) ? (record.features as string[]) : undefined,
    trial_months: record.trial_months,
    monthly: planPricing(record.key as Plan)?.monthly ?? null,
    yearlyMonthly: planPricing(record.key as Plan)?.yearlyMonthly ?? null,
  })) as PlanText[];

  return (
    <section id="fiyat" data-track-view="pricing_viewed" className="mx-auto max-w-6xl px-5 py-24">
      <p className="text-center font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">Hesap lütfen</p>
      <h2 className="mt-3 text-center font-display text-4xl font-extrabold tracking-tight md:text-5xl">
        Baskı maliyetinden ucuz
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-ink-soft">
        Bir kez menü bastırmanın parasıyla aylarca dijital kalın. Ücretsiz başlayın, işinize yaradığında devam edin.
      </p>

      <PlanGrid texts={texts} freemiumViews={freemium.viewsLabel} />

      <p className="mx-auto mt-10 max-w-2xl rounded-2xl border border-line bg-crema/40 px-5 py-4 text-center text-sm text-ink-soft">
        <span className="font-semibold text-ink">Freemium: {freemium.summary}
          {" "}
          kadar ücretsiz.</span>{" "}
        İki limitten hangisi önce dolarsa Freemium sona erer. Ürün ve kategori sayısı hiçbir planda sınırlı değildir —
        menünüzün tamamını girebilirsiniz. Premium ve Elite&apos;te süre ya da görüntülenme sınırı yoktur.
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
          {featureMatrix().map((row) => (
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

// Landing sayfası bu listeden FAQPage yapılandırılmış verisi de üretiyor
// (app/page.tsx) — soru/cevap metinleri tek yerde dursun.
export function getFaqs() {
  const freemium = freemiumLimits();
  const premium = planPricing("premium");
  const elite = planPricing("elite");
  return [
  {
    q: "buyur sipariş alıyor mu?",
    a: "Bugün sipariş ya da ödeme almıyor. Müşteri beğendiklerini sepette toplar, toplamı görür ve ekranı garsona gösterir; siparişi garsonunuz alır. Yanlış ya da eksik sipariş azalır, mevcut düzeniniz değişmez.",
  },
  {
    q: "Freemium ne kadar süre ücretsiz?",
    a: `Freemium plan ${freemium.summary} kadar ücretsizdir. Bu iki limitten hangisi önce dolarsa Freemium sona erer. Kredi kartı istemiyoruz.`,
  },
  {
    q: "Freemium'da kaç ürün girebilirim?",
    a: `Sınırsız. Hiçbir planda ürün ya da kategori limiti yoktur; menünüzün tamamını eksiksiz girebilirsiniz. Freemium'ın tek sınırı süre ve görüntülenmedir: ${freemium.summary}.`,
  },
  {
    q: "Premium ve Elite arasındaki fark nedir?",
    a: "Premium; kampanyalar, gelişmiş analizler, buyur markası olmadan profesyonel menü içerir. Elite bunlara menünüzden otomatik oluşan web sitesini (animasyonlu tanıtım, menü slider'ı, galeri), rapor merkezini (PDF ve CSV dışa aktarma) ve öncelikli teknik desteği ekler.",
  },
  {
    q: "Premium'a nasıl geçerim?",
    a: "Ücretsiz hesabınızı açın, ardından panelde Plan sayfasından “Premium'u başlat” deyin. Talebiniz ekibimize düşer; ödeme ve aktivasyon adımlarını destek talebiniz üzerinden tamamlarız. Menünüz ve verileriniz olduğu gibi kalır.",
  },
  {
    q: "Aylık mı yıllık mı ödemeliyim?",
    a:
      premium && elite
        ? `İkisi de mümkün. Yıllık ödemede aylık maliyet %${yearlyDiscountPercent(premium)} düşer: Premium ayda ${formatTL(premium.monthly)} yerine ${formatTL(premium.yearlyMonthly)} (yıllık ${formatTL(premium.yearlyMonthly * MONTHS_IN_YEAR)} peşin), Elite ayda ${formatTL(elite.monthly)} yerine ${formatTL(elite.yearlyMonthly)} (yıllık ${formatTL(elite.yearlyMonthly * MONTHS_IN_YEAR)} peşin). Aylık ödemede taahhüt yok, istediğiniz dönem sonunda bırakabilirsiniz.`
        : "İkisi de mümkün. Yıllık ödemede aylık maliyet düşer; güncel fiyatlar için bize yazın. Aylık ödemede taahhüt yok, istediğiniz dönem sonunda bırakabilirsiniz.",
  },
  {
    q: "Freemium süresi dolunca verilerim silinir mi?",
    a: "Hayır. Menünüz, ürünleriniz, görselleriniz ve analiz geçmişiniz olduğu gibi kalır. Yalnızca menünüzün yayını ve gelişmiş özellikler durur; bir plana geçtiğinizde her şey kaldığı yerden devam eder.",
  },
  {
    q: "Fiyat değiştirdiğimde müşteri ne zaman görür?",
    a: "Anında. Kaydet dediğiniz saniyede, açık olan tüm menülerde yeni fiyat görünür. Baskı beklemek yok.",
  },
  {
    q: "QR kodu nasıl alacağım?",
    a: "Kayıt olduğunuzda otomatik oluşur. Panelden yüksek çözünürlüklü indirir, dilediğiniz boyutta bastırırsınız. Masa numaralı QR'ları toplu oluşturup tek PDF olarak alabilir, hangi masanın QR'ının menüyü açtırıp sepete dönüştüğünü ayrı ayrı görebilirsiniz.",
  },
  {
    q: "Analizler tam olarak neyi gösteriyor?",
    a: "Menünüzün kaç kez açıldığını, hangi ürünlerin incelenip sepete eklendiğini, müşterinin menüde ne kadar kaldığını ve trafiğin nereden geldiğini. Freemium'da temel özet, Premium ve Elite'te ürün, kategori, kaynak ve QR kırılımları.",
  },
  {
    q: "Teknik bilgim yok, kullanabilir miyim?",
    a: "Kesinlikle. Ürün eklemek fotoğraf paylaşmak kadar kolay. İsterseniz menünüzü gönderin, demo menünüzü biz hazırlayalım.",
  },
  ];
}

export function FAQ() {
  return (
    <section className="border-t border-line bg-crema/40">
      <div className="mx-auto max-w-3xl px-5 py-24">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight">Sık sorulanlar</h2>
        <div className="mt-10 divide-y divide-line">
          {getFaqs().map((f) => (
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
            Yazın, gerçek bir insan cevaplasın. Satış konuşması değil — sadece merak ettiğinizi öğrenin.
          </p>
          <a
            href={whatsappLink("Merhaba, buyur hakkında bir sorum var:")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_lead"
            data-track-location="faq"
            className="inline-flex items-center gap-2 rounded-md border border-ink px-6 py-3 font-mono text-[13px] uppercase tracking-wider transition-colors hover:bg-ink hover:text-paper"
          >
            <WhatsappIcon size={15} />
            WhatsApp&apos;tan sorun
          </a>
        </div>
      </div>
    </section>
  );
}

// Kapanış CTA'sı herkese hitap etmeli: tek bir "restoran sahibi" tipi
// yok — mahalle kafesi de, otel de aynı yerden başlıyor.
const audiences = [
  "Kafeler",
  "Restoranlar",
  "Pastaneler",
  "Oteller",
  "Barlar",
  "Kahvaltı salonları",
  "Food truck'lar",
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

      <div data-reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-5 py-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/70">Bir sonraki servis</p>

        <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-paper md:text-5xl">
          Bir sonraki servise güncel menüyle başlayın.
        </h2>

        <p className="max-w-lg leading-relaxed text-paper/80">
          Kredi kartı girmeden hesabınızı açın ya da mevcut menünüzü gönderin, ilk kurulumu birlikte yapalım.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/panel/register"
            data-track="cta_click"
            data-track-location="final"
            data-track-cta="create_free"
            className="shine-on-hover relative overflow-hidden rounded-md bg-ink px-9 py-4 text-center font-mono text-sm uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(35,24,18,0.7)]"
          >
            Ücretsiz menünü oluştur
          </Link>
          <a
            href={whatsappLink("Merhaba! Menümü göndermek istiyorum, ilk kurulumu birlikte yapabilir miyiz?")}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_lead"
            data-track-location="final"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-paper/40 px-9 py-4 text-center font-mono text-sm uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:border-paper hover:bg-paper hover:text-paprika"
          >
            <WhatsappIcon size={15} />
            Menümü gönder
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
