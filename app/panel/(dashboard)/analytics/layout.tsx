"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnalyticsFilterProvider } from "@/components/panel/analytics/filters";

// Analiz merkezi kabuğu: sekmeler + filtre bağlamı. Filtreler sekmeler arasında
// korunur (bkz. components/panel/analytics/filters.tsx).

const TABS = [
  { href: "/panel/analytics", label: "Genel bakış" },
  { href: "/panel/analytics/products", label: "Ürünler" },
  { href: "/panel/analytics/categories", label: "Kategoriler" },
  { href: "/panel/analytics/acquisition", label: "Trafik" },
  { href: "/panel/analytics/activity", label: "Aktivite" },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnalyticsFilterProvider>
      <div>
        <nav className="mb-6 flex gap-5 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = tab.href === "/panel/analytics" ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative -mb-px whitespace-nowrap border-b-2 pb-3 pt-1 text-[13px] font-semibold uppercase tracking-wide transition-colors ${
                  active ? "border-paprika text-paprika" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </AnalyticsFilterProvider>
  );
}
