"use client";

import { useState } from "react";
import Link from "next/link";
import { whatsappLink } from "@/lib/site";
import { CheckCircleIcon, WhatsappIcon } from "@/components/icons";
import { MONTHS_IN_YEAR, PLAN_PRICING, formatTL, yearlyDiscountPercent } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/entitlements";
import { PLAN_SEEDS } from "@/scripts/plan-catalog.mjs";
import type { Plan } from "@/lib/types";

// Fiyat kartlarının içeriği (ad, açıklama, özellikler) veritabanına yazılan
// paket kataloğuyla AYNI kaynaktan, rakamlar ilan fiyatının tek kaynağından
// (lib/pricing.ts) geliyor. Canlı `menuva_plans` kaydı bayat kalsa bile (göç
// çalıştırılmamış olsa bile) sitede çelişkili bir paket metni görünmez —
// toplantıdaki "30 ürün / sınırsız ürün" çelişkisi tam olarak buradan doğmuştu.

interface PlanCard {
  key: Plan;
  name: string;
  desc: string;
  features: string[];
  monthly: number;
  yearlyMonthly: number;
  trialMonths: number;
  highlight: boolean;
  badge?: string;
}

const CARDS: PlanCard[] = PLAN_ORDER.map((key) => {
  const seed = PLAN_SEEDS.find((entry) => entry.key === key);
  return {
    key,
    name: seed?.name ?? key,
    desc: seed?.description ?? "",
    features: seed?.features ?? [],
    monthly: PLAN_PRICING[key].monthly,
    yearlyMonthly: PLAN_PRICING[key].yearlyMonthly,
    trialMonths: seed?.trial_months ?? 0,
    // "En çok tercih edilen" vurgusu bilinçli olarak orta katmana sabit.
    highlight: key === "premium",
    badge: key === "premium" ? "En çok tercih edilen" : undefined,
  };
});

type Billing = "monthly" | "yearly";

function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (b: Billing) => void }) {
  const discount = yearlyDiscountPercent(PLAN_PRICING.premium);
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

/** Yıllıkta büyük rakam aylık karşılıktır; peşin tutar hemen altında AYNI
 *  okunurlukta yazılır ("Aylık karşılığı 199,20₺ — yıllık 2.390,40₺ peşin"). */
function PlanPrice({ card, billing }: { card: PlanCard; billing: Billing }) {
  const soft = card.highlight ? "text-paper/60" : "text-ink-soft";
  const eyebrow = `mt-4 font-mono text-[10px] uppercase tracking-wider ${soft}`;

  if (card.monthly === 0) {
    return (
      <>
        <p className={eyebrow}>{card.trialMonths > 0 ? `${card.trialMonths} ay ücretsiz` : "Ücretsiz"}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-5xl font-extrabold">0₺</span>
        </div>
        <p className="mt-2 text-sm font-semibold">
          {card.trialMonths > 0 ? `${card.trialMonths} ay veya 10.000 görüntülenme` : "Süre sınırı yok"}
        </p>
        <p className={`text-xs ${soft}`}>Kredi kartı istenmez</p>
      </>
    );
  }

  const saving = Math.round((1 - card.yearlyMonthly / card.monthly) * 100);

  if (billing === "yearly") {
    return (
      <>
        <p className={eyebrow}>Aylık karşılığı</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-5xl font-extrabold">{formatTL(card.yearlyMonthly)}</span>
          <span className={`font-mono text-xs uppercase tracking-wider ${soft}`}>/ ay</span>
        </div>
        <p className="mt-2 text-sm font-semibold">Yıllık {formatTL(card.yearlyMonthly * MONTHS_IN_YEAR)} peşin</p>
        <p className={`text-xs ${soft}`}>{saving > 0 ? `Aylık ödemeye göre %${saving} tasarruf` : "Tek seferde tahsil edilir"}</p>
      </>
    );
  }

  return (
    <>
      <p className={eyebrow}>Aylık ödeme</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold">{formatTL(card.monthly)}</span>
        <span className={`font-mono text-xs uppercase tracking-wider ${soft}`}>/ ay</span>
      </div>
      <p className="mt-2 text-sm font-semibold">Her ay faturalanır · taahhüt yok</p>
      <p className={`text-xs ${soft}`}>Yıllık ödersen ayda {formatTL(card.yearlyMonthly)}</p>
    </>
  );
}

/** Satın alma yolları: Freemium ve Premium kayıt akışından başlar (WhatsApp'a
 *  bağımlı değil); Elite bir demo görüşmesiyle başlar. */
function PlanCta({ card, billing }: { card: PlanCard; billing: Billing }) {
  const style = card.highlight
    ? "bg-paprika text-paper hover:bg-paprika-deep hover:shadow-[0_16px_34px_-12px_rgba(232,73,31,0.9)]"
    : "border border-ink text-ink hover:bg-ink hover:text-paper";
  const className = `shine-on-hover relative mt-8 flex items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-center font-mono text-[13px] uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 ${style}`;
  const note = `mt-2.5 text-center text-[11px] ${card.highlight ? "text-paper/50" : "text-ink-soft/80"}`;

  if (card.key === "freemium") {
    return (
      <>
        <Link href="/panel/register" data-track="plan_cta" data-track-plan="freemium" className={className}>
          Ücretsiz oluştur
        </Link>
        <p className={note}>Menünü kur, QR&apos;ını yayına al</p>
      </>
    );
  }

  if (card.key === "premium") {
    return (
      <>
        <Link
          href={`/panel/register?plan=premium&billing=${billing}`}
          data-track="plan_cta"
          data-track-plan="premium"
          data-track-billing={billing}
          className={className}
        >
          Premium&apos;u başlat
        </Link>
        <p className={note}>Hesabını aç, ödemeyi panelden başlat</p>
      </>
    );
  }

  return (
    <>
      <a
        href={whatsappLink("Merhaba! menuva Elite paketi için demo görmek istiyorum.")}
        target="_blank"
        rel="noopener noreferrer"
        data-track="plan_cta"
        data-track-plan="elite"
        className={className}
      >
        Elite demo al
      </a>
      <p className={note}>Demo görüşmesi WhatsApp&apos;tan planlanır</p>
    </>
  );
}

export function PlanGrid() {
  // Varsayılan yıllık: ilan edilen fiyat yıllık kurguya göre belirlendi.
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <>
      <BillingToggle billing={billing} onChange={setBilling} />

      <div className="mt-12 grid items-start gap-5 md:grid-cols-3">
        {CARDS.map((card, i) => (
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
            <p className={`mt-1 text-sm ${card.highlight ? "text-paper/60" : "text-ink-soft"}`}>{card.desc}</p>
            <PlanPrice card={card} billing={billing} />

            <ul className="mt-6 flex-1 space-y-2.5 border-t border-current/10 pt-6 text-sm">
              {card.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-herb" aria-hidden>
                    <CheckCircleIcon size={15} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <PlanCta card={card} billing={billing} />
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-ink-soft">
        Karar vermeden önce sormak mı istiyorsunuz?{" "}
        <a
          href={whatsappLink("Merhaba, menuva paketleri hakkında bir sorum var:")}
          target="_blank"
          rel="noopener noreferrer"
          data-track="whatsapp_lead"
          data-track-location="pricing"
          className="inline-flex items-center gap-1 font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:text-paprika"
        >
          <WhatsappIcon size={13} /> WhatsApp&apos;tan yazın
        </a>
      </p>
    </>
  );
}
