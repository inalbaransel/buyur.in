"use client";

import Link from "next/link";
import { useBusiness } from "@/components/panel/business-context";
import { PageHeader } from "@/components/panel/ui";
import { PlanUsageCard } from "@/components/panel/plan-usage";
import { CheckCircleIcon, SparkIcon, WhatsappIcon } from "@/components/icons";
import { planWhatsappLink } from "@/lib/site";
import { FEATURE_MATRIX, PLAN_LABELS, PLAN_ORDER, freemiumUsage, normalizePlan } from "@/lib/entitlements";
import type { Plan } from "@/lib/types";

// Plan sayfası: mevcut plan, Freemium kullanımı ve planların karşılaştırması.
// Tablo lib/entitlements.ts'ten geliyor — pazarlama sitesiyle aynı kaynak,
// dolayısıyla "sitede yazan" ile "panelde uygulanan" ayrışamaz.

const PLAN_PITCH: Record<Plan, string> = {
  freemium: "3 ay veya 10.000 menü görüntülenme — hangisi önce dolarsa.",
  premium: "Sınırsız kullanım, gelişmiş analizler ve otomatik web sitesi.",
  elite: "Gelişmiş web sitesi, gelişmiş raporlar ve dışa aktarma.",
};

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="font-mono text-[12px] uppercase tracking-wider">{value}</span>;
  }
  return value ? (
    <span className="inline-flex text-herb" aria-label="var">
      <CheckCircleIcon size={16} />
    </span>
  ) : (
    <span className="text-ink-soft/40" aria-label="yok">
      —
    </span>
  );
}

export default function PlanPage() {
  const { business } = useBusiness();
  if (!business) return null;

  const current = normalizePlan(business.plan);
  const usage = freemiumUsage(business);
  // Yalnızca mevcut plandan DAHA YÜKSEK planlar "yükseltme" olarak gösterilir.
  // Elite (en üst plan) için bu liste boş kalır — "geç" seçeneği anlamsız olurdu.
  const upgrades = PLAN_ORDER.filter((plan) => PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(current));

  return (
    <div>
      <PageHeader
        title="Plan ve kullanım"
        description="Hangi plandasınız, ne kadar kullandınız ve yükseltince ne kazanırsınız"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanUsageCard business={business} />

        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Planınızda neler var</p>
          <ul className="mt-3 space-y-2 text-sm">
            {FEATURE_MATRIX.filter((row) => row.values[current] !== false).map((row) => (
              <li key={row.label} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-herb" aria-hidden>
                  <CheckCircleIcon size={15} />
                </span>
                <span>
                  {row.label}
                  {typeof row.values[current] === "string" && (
                    <span className="text-ink-soft"> — {row.values[current] as string}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {usage.limited && (
            <p className="mt-4 rounded-xl bg-crema/70 px-4 py-3 text-xs leading-relaxed text-ink-soft">
              Freemium&apos;da süre ve menü görüntülenme birlikte izlenir; hangisi önce dolarsa plan sona erer.
              Verileriniz silinmez — yükselttiğinizde menünüz ve analizleriniz olduğu gibi devam eder.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-crema/50 text-left">
              <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-soft">Özellik</th>
              {PLAN_ORDER.map((plan) => (
                <th key={plan} className="px-5 py-3 text-center">
                  <span
                    className={`font-display text-base font-bold ${plan === current ? "text-paprika" : ""}`}
                  >
                    {PLAN_LABELS[plan]}
                  </span>
                  {plan === current && (
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-paprika">
                      Mevcut plan
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_MATRIX.map((row) => (
              <tr key={row.label} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3">{row.label}</td>
                {PLAN_ORDER.map((plan) => (
                  <td key={plan} className={`px-5 py-3 text-center ${plan === current ? "bg-paprika/5" : ""}`}>
                    <Cell value={row.values[plan]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {upgrades.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {upgrades.map((plan) => (
            <div key={plan} className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-lg font-bold">{PLAN_LABELS[plan]}</p>
              <p className="mt-1 text-sm text-ink-soft">{PLAN_PITCH[plan]}</p>
              <a
                href={planWhatsappLink(PLAN_LABELS[plan])}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 font-mono text-[12px] uppercase tracking-wider text-paper transition-colors hover:bg-paprika"
              >
                <WhatsappIcon size={14} />
                {PLAN_LABELS[plan]}&apos;a geç
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-ink bg-ink px-8 py-10 text-center text-paper">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{ background: "radial-gradient(60% 90% at 50% 0%, var(--color-paprika), transparent)" }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-3">
            <span className="inline-flex rounded-full bg-paprika/15 p-3 text-paprika">
              <SparkIcon size={22} />
            </span>
            <p className="font-mono text-[11px] uppercase tracking-wider text-paper/60">En üst seviye</p>
            <p className="font-display text-xl font-bold sm:text-2xl">Elite plandasınız</p>
            <p className="max-w-md text-sm leading-relaxed text-paper/70">
              menuva&apos;nın tüm özellikleri sizde açık: sınırsız kullanım, gelişmiş analizler, otomatik web
              sitesi, gelişmiş raporlar ve dışa aktarma. Yükseltilecek başka bir plan yok.
            </p>
            <Link
              href="/panel/support"
              className="mt-1 inline-flex items-center gap-2 rounded-md border border-paper/25 px-5 py-2.5 font-mono text-[12px] uppercase tracking-wider text-paper transition-colors hover:border-paprika hover:text-paprika"
            >
              Destek ile iletişime geç
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
