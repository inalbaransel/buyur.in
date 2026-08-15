"use client";

import { AnalyticsFilterProvider } from "@/components/panel/analytics/filters";

// Raporlar analiz filtrelerini (tarih aralığı, karşılaştırma) paylaşır.
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsFilterProvider>{children}</AnalyticsFilterProvider>;
}
