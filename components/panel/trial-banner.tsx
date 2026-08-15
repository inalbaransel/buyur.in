"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBusiness } from "@/components/panel/business-context";
import { fetchPlan } from "@/lib/plan-limits";
import { ClockIcon, LockIcon } from "@/components/icons";
import { formatDate, trialStatus } from "@/lib/plan-period";
import { planLabels } from "@/lib/labels";

/** Süreli plandaki (Freemium denemesi) işletmeye kalan süreyi hatırlatan bant.
 *  Süre dolduğunda menü kapatılmıyor — sadece uyarı gösteriliyor; kesme kararı
 *  ödeme akışı devreye girdiğinde verilecek (bkz. components/panel/ui.tsx
 *  UpgradeNotice, aynı "yükseltmek için destek" yönlendirmesi). */
export function TrialBanner() {
  const { business } = useBusiness();
  // Ücretli plana geçen bir işletmede eski deneme bitişi kayıtta kalmış
  // olabilir; sayacı yalnızca planın kendisi süreliyse gösteriyoruz.
  const [isTrialPlan, setIsTrialPlan] = useState<boolean | null>(null);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    fetchPlan(business.plan).then((plan) => {
      if (!cancelled) setIsTrialPlan((plan?.trial_months ?? 0) > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [business]);

  if (!business || isTrialPlan !== true) return null;

  const status = trialStatus(business);
  if (!status || !status.warn) return null;

  const planName = planLabels[business.plan];

  return (
    <div
      className={`mb-6 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        status.expired ? "border-paprika/40 bg-paprika/5" : "border-line bg-crema/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${status.expired ? "text-paprika" : "text-ink-soft"}`} aria-hidden>
          {status.expired ? <LockIcon size={18} /> : <ClockIcon size={18} />}
        </span>
        <div>
          <p className="font-display text-sm font-bold">
            {status.expired
              ? `${planName} deneme süren doldu`
              : `${planName} denemenin bitmesine ${status.daysLeft} gün kaldı`}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {status.expired
              ? `Süre ${formatDate(status.expiresAt)} tarihinde bitti. Menün yayında kalmaya devam ediyor — kesintisiz sürdürmek için planını yükselt.`
              : `Deneme ${formatDate(status.expiresAt)} tarihinde bitiyor. Devam etmek istersen şimdiden planını seçebilirsin.`}
          </p>
        </div>
      </div>
      <Link
        href="/panel/support"
        className={`shrink-0 rounded-md px-5 py-2.5 text-center font-mono text-[12px] uppercase tracking-wider transition-colors ${
          status.expired
            ? "bg-ink text-paper hover:bg-paprika"
            : "border border-line text-ink hover:border-paprika hover:text-paprika"
        }`}
      >
        Planımı yükselt
      </Link>
    </div>
  );
}
