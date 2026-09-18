"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/components/panel/business-context";
import { PopupForm } from "@/components/panel/popup-form";
import { PageHeader, UpgradeNotice } from "@/components/panel/ui";
import { isFeatureAvailable } from "@/lib/entitlements";

export default function NewAnnouncementPage() {
  const { business, isLoading } = useBusiness();
  const router = useRouter();
  // Kampanya kapısı canlı plan kaydından okunur (BusinessProvider katalogu yükler).
  const campaignsAllowed = business ? isFeatureAvailable(business, "campaigns") : null;


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
