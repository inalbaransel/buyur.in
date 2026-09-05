"use client";

import { useState } from "react";
import Link from "next/link";
import { planWhatsappLink } from "@/lib/site";
import { CheckCircleIcon, WhatsappIcon } from "@/components/icons";
import { MONTHS_IN_YEAR, PLAN_PRICING, formatTL } from "@/lib/pricing";
import type { PlanRecord } from "@/lib/types";

// Fiyat kartının görsel/davranışsal alanları — `menuva_plans` koleksiyonu sadece
// ham veriyi tutar; cta metni/href/vurgu gibi sunum kararları burada türetiliyor.
type PlanCard = {
  key: string;
  name: string;
  desc: string;
  features: string[];
  /** Aylık ödemede aylık ücret. */
  monthly: number;
  /** Yıllık ödemede aylık eşdeğer ücret; yıllık toplam = 12 katı. */
  yearlyMonthly: number;
  /** Süreli ücretsiz plan ise kaç ay sürdüğü; ücretli planlarda 0. */
  trialMonths: number;
  highlight: boolean;
  badge?: string;
};

type Billing = "monthly" | "yearly";

function isFree(card: PlanCard): boolean {
  return card.monthly === 0 && card.yearlyMonthly === 0;
}

/** Fiyat alanları aylık modele göç etmemiş (scripts/migrate-plan-pricing.mjs
 *  henüz çalışmamış) kayıtları eliyoruz — eksik alanı 0 kabul edip Premium'u
 *  "0₺" göstermektense statik yedeğe düşmek daha az yanıltıcı. */
function hasPricing(plan: PlanRecord): boolean {
  return Number.isFinite(plan.price_monthly) && Number.isFinite(plan.price_yearly_monthly);
}

function toPlanCard(plan: PlanRecord): PlanCard {
  return {
    key: plan.key,
    name: plan.name,
    desc: plan.description,
    features: plan.features,
    monthly: plan.price_monthly,
    yearlyMonthly: plan.price_yearly_monthly,
    trialMonths: plan.trial_months ?? 0,
    // "En çok tercih edilen" vurgusu bilinçli olarak orta katmana (premium) sabit —
    // paket sayısı/sırası değişse de landing'in tasarım niyeti bu.
    highlight: plan.key === "premium",
    badge: plan.key === "premium" ? "En çok tercih edilen" : undefined,
  };
}

// PocketBase'e ulaşılamadığı ya da `menuva_plans` koleksiyonu henüz seed
// edilmediği (bkz. scripts/migrate-plans.mjs) nadir durumda landing'in fiyat
// bölümü boş kalmasın diye son çare statik bir yedek. Rakamlar lib/pricing.ts'ten
// geliyor (ilan edilen fiyatın tek kaynağı), burada elle yazılmaz.
const FALLBACK_CARDS: PlanCard[] = [
  {
    key: "freemium",
    name: "Freemium",
    desc: "Denemek ve küçük menüler için",
    features: [
      "3 ay veya 10.000 menü görüntülenme",
      "Sınırsız ürün ve kategori",
      "Dijital QR menü",
      "Temel analizler",
      "QR kod & özel URL",
      "Anlık güncellemeler",
    ],
    monthly: PLAN_PRICING.freemium.monthly,
    yearlyMonthly: PLAN_PRICING.freemium.yearlyMonthly,
    trialMonths: 3,
    highlight: false,
  },
  {
    key: "premium",
    name: "Premium",
    desc: "Satışı büyütmek isteyen mekanlar için",
    features: [
      "Sınırsız menü görüntülenme",
      "Sınırsız ürün · süre sınırı yok",
      "Standart web sitesi (menüden otomatik)",
      "Gelişmiş analizler ve içgörüler",
      "Kampanyalar · özel alan adı · marka kaldırma",
    ],
    monthly: PLAN_PRICING.premium.monthly,
    yearlyMonthly: PLAN_PRICING.premium.yearlyMonthly,
    trialMonths: 0,
    highlight: true,
    badge: "En çok tercih edilen",
  },
  {
    key: "elite",
    name: "Elite",
    desc: "Zincirler ve çoklu şubeler için",
    features: [
      "Premium'daki her şey",
      "Hediye kurumsal web sitesi (kurulumu bizden)",
      "Gelişmiş web sitesi deneyimi",
      "Gelişmiş raporlar",
      "PDF · Excel · CSV dışa aktarma",
      "Öncelikli teknik destek",
    ],
    monthly: PLAN_PRICING.elite.monthly,
    yearlyMonthly: PLAN_PRICING.elite.yearlyMonthly,
    trialMonths: 0,
    highlight: false,
  },
];

/** Yıllık ödemenin aylığa göre kaç puan ucuz olduğu — toggle rozetindeki oran.
 *  Paketler farklı oranlar taşırsa en yükseğini gösteriyoruz ("%X'e varan"
 *  demek yerine tek rakam: kartların altındaki tasarruf satırı zaten net). */
function yearlyDiscountPercent(cards: PlanCard[]): number {
  const rates = cards
    .filter((card) => !isFree(card) && card.monthly > 0)
    .map((card) => 1 - card.yearlyMonthly / card.monthly);
  if (rates.length === 0) return 0;
  return Math.round(Math.max(...rates) * 100);
}

function BillingToggle({ billing, onChange, discount }: { billing: Billing; onChange: (b: Billing) => void; discount: number }) {
  const options: { value: Billing; label: string }[] = [
    { value: "monthly", label: "Aylık" },
    { value: "yearly", label: "Yıllık" },
  ];

  return (
    <div className="mt-10 flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-crema/60 p-1">
        {options.map((option) => {
          const active = billing === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[12px] uppercase tracking-wider transition-all duration-300 ${
                active ? "bg-ink text-paper shadow-[0_8px_18px_-10px_rgba(35,24,18,0.9)]" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.label}
              {option.value === "yearly" && discount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] tracking-wide ${
                    active ? "bg-paprika text-paper" : "bg-paprika/10 text-paprika"
                  }`}
                >
                  −%{discount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanPrice({ card, billing }: { card: PlanCard; billing: Billing }) {
  const muted = card.highlight ? "text-paper/50" : "text-ink-soft";

  if (isFree(card)) {
    return (
      <>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-5xl font-extrabold">0₺</span>
          <span className={`font-mono text-xs uppercase tracking-wider ${muted}`}>
            {card.trialMonths > 0 ? `${card.trialMonths} ay*` : "ücretsiz"}
          </span>
        </div>
        <p className={`mt-1 text-xs ${card.highlight ? "text-paper/50" : "text-ink-soft/80"}`}>
          {card.trialMonths > 0
            ? `${card.trialMonths} ay veya 10.000 görüntülenme · kredi kartı yok`
            : "Süre sınırı yok · kredi kartı yok"}
        </p>
      </>
    );
  }

  const amount = billing === "yearly" ? card.yearlyMonthly : card.monthly;
  const savingPercent = card.monthly > 0 ? Math.round((1 - card.yearlyMonthly / card.monthly) * 100) : 0;

  return (
    <>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold">{formatTL(amount)}</span>
        <span className={`font-mono text-xs uppercase tracking-wider ${muted}`}>/ ay</span>
      </div>
      <p className={`mt-1 text-xs ${card.highlight ? "text-paper/50" : "text-ink-soft/80"}`}>
        {billing === "yearly"
          ? `Yıllık ${formatTL(card.yearlyMonthly * MONTHS_IN_YEAR)} tek ödeme${savingPercent > 0 ? ` · %${savingPercent} tasarruf` : ""}`
          : `Yıllık ödemede ayda ${formatTL(card.yearlyMonthly)}`}
      </p>
    </>
  );
}

function PlanCta({ card }: { card: PlanCard }) {
  const style = card.highlight
    ? "bg-paprika text-paper hover:bg-paprika-deep hover:shadow-[0_16px_34px_-12px_rgba(232,73,31,0.9)]"
    : "border border-ink text-ink hover:bg-ink hover:text-paper";

  const className = `shine-on-hover relative mt-8 flex items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-center font-mono text-[13px] uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 ${style}`;

  // Ödeme akışı henüz yok: ücretsiz plan doğrudan kayda gider, ücretli planlar
  // WhatsApp'a — plan adı mesaja yazılır (bkz. lib/site.ts planWhatsappLink).
  if (isFree(card)) {
    return (
      <Link href="/panel/register" className={className}>
        Ücretsiz başla
      </Link>
    );
  }

  return (
    <a href={planWhatsappLink(card.name)} target="_blank" rel="noopener noreferrer" className={className}>
      <WhatsappIcon size={15} />
      WhatsApp&apos;tan başvur
    </a>
  );
}

export function PlanGrid({ plans }: { plans: PlanRecord[] }) {
  const live = plans.filter(hasPricing).map(toPlanCard);
  const cards = live.length > 0 ? live : FALLBACK_CARDS;
  // Varsayılan yıllık: paketlerin ilan edilen fiyatı (ayda 200₺/400₺) yıllık
  // ödemeye göre kurgulandı, aylığa geçiş bilinçli bir tercih olsun.
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <>
      <BillingToggle billing={billing} onChange={setBilling} discount={yearlyDiscountPercent(cards)} />

      <div className="mt-12 grid items-start gap-5 md:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={card.key}
            data-reveal
            style={{ transitionDelay: `${i * 90}ms` }}
            className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1.5 ${
              card.highlight
                ? "border-paprika bg-ink text-paper shadow-[0_24px_50px_-20px_rgba(232,73,31,0.4)] hover:shadow-[0_34px_60px_-20px_rgba(232,73,31,0.55)] md:-mt-4"
                : "border-line bg-paper hover:border-ink/30 hover:shadow-[0_24px_50px_-28px_rgba(35,24,18,0.5)]"
            }`}
          >
            {card.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paprika px-3.5 py-1 font-mono text-[10px] uppercase tracking-wider text-paper">
                {card.badge}
              </span>
            )}

            <h3 className="font-display text-xl font-bold">{card.name}</h3>
            <PlanPrice card={card} billing={billing} />
            <p className={`mt-2 text-sm ${card.highlight ? "text-paper/60" : "text-ink-soft"}`}>{card.desc}</p>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {card.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-herb" aria-hidden>
                    <CheckCircleIcon size={15} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <PlanCta card={card} />
          </div>
        ))}
      </div>
    </>
  );
}
