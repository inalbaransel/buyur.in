"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/components/panel/business-context";
import { PopupForm } from "@/components/panel/popup-form";
import { PageHeader, UpgradeNotice } from "@/components/panel/ui";
import { fetchPlanLimits } from "@/lib/plan-limits";

export default function NewAnnouncementPage() {
  const { business, isLoading } = useBusiness();
  const router = useRouter();
  const [campaignsAllowed, setCampaignsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    fetchPlanLimits(business.plan).then((limits) => {
      if (!cancelled) setCampaignsAllowed(limits.campaigns);
    });
    return () => {
      cancelled = true;
    };
  }, [business]);

  if (isLoading || !business || campaignsAllowed === null) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  if (!campaignsAllowed) {
    return (
      <UpgradeNotice
        title="Kampanyalar mevcut planında kapalı"
        description="Menü açıldığında gösterilecek kampanya/duyuru oluşturmak için planını yükseltmen gerekiyor."
      />
    );
  }

  return (
    <div>
      <PageHeader title="Yeni duyuru" />
      <PopupForm business={business} onSaved={() => router.replace("/panel/popups")} onCancel={() => router.back()} />
    </div>
  );
}
