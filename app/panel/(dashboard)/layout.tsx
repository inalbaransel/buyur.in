"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/chrome";
import { useAuth } from "@/lib/use-auth";
import { pb } from "@/lib/pocketbase";
import { BusinessProvider, useBusiness } from "@/components/panel/business-context";
import { NotificationBell } from "@/components/panel/notification-bell";
import { ToastProvider } from "@/components/panel/toast";
import { TrialBanner } from "@/components/panel/trial-banner";
import { menuUrl } from "@/lib/site";
import {
  ExternalLinkIcon,
  FileTextIcon,
  FolderIcon,
  LayoutIcon,
  LifeBuoyIcon,
  LogoutIcon,
  MegaphoneIcon,
  PackageIcon,
  QrCodeIcon,
  SettingsIcon,
  StarIcon,
  TrendingUpIcon,
  UsersIcon,
} from "@/components/icons";

const navItems = [
  { href: "/panel", label: "Genel bakış", Icon: LayoutIcon, prefixes: ["/panel"] },
  { href: "/panel/analytics", label: "Analiz", Icon: TrendingUpIcon, prefixes: ["/panel/analytics"] },
  { href: "/panel/categories", label: "Kategoriler", Icon: FolderIcon, prefixes: ["/panel/categories", "/panel/category/"] },
  { href: "/panel/products", label: "Ürünler", Icon: PackageIcon, prefixes: ["/panel/products", "/panel/product/"] },
  { href: "/panel/popups", label: "Kampanyalar", Icon: MegaphoneIcon, prefixes: ["/panel/popups", "/panel/popup/"] },
  { href: "/panel/qr", label: "QR kodlar", Icon: QrCodeIcon, prefixes: ["/panel/qr"] },
  { href: "/panel/reports", label: "Raporlar", Icon: FileTextIcon, prefixes: ["/panel/reports"] },
  { href: "/panel/reviews", label: "Değerlendirmeler", Icon: StarIcon, prefixes: ["/panel/reviews"] },
  { href: "/panel/team", label: "Ekip", Icon: UsersIcon, prefixes: ["/panel/team"] },
  { href: "/panel/support", label: "Destek", Icon: LifeBuoyIcon, prefixes: ["/panel/support"] },
  { href: "/panel/settings", label: "Ayarlar", Icon: SettingsIcon, prefixes: ["/panel/settings"] },
];

function isNavItemActive(pathname: string, item: (typeof navItems)[number]) {
  if (item.href === "/panel") return pathname === "/panel";
  return item.prefixes.some((prefix) => pathname.startsWith(prefix));
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { business, isLoading } = useBusiness();

  function handleLogout() {
    pb.authStore.clear();
    router.replace("/panel/login");
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-soft">Yükleniyor…</div>;
  }

  return (
    <div className="min-h-screen bg-crema/30">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/panel">
            <Logo />
          </Link>
          <div className="flex items-center gap-2.5">
            {business && (
              <a
                href={menuUrl(business.slug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-herb px-3.5 py-2 font-mono text-[12px] uppercase tracking-wider text-paper shadow-sm transition-colors hover:bg-herb/90"
              >
                <ExternalLinkIcon size={15} strokeWidth={2} />
                <span className="hidden sm:inline">Menüyü gör</span>
              </a>
            )}
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 font-mono text-[12px] uppercase tracking-wider text-ink transition-colors hover:border-paprika hover:text-paprika"
            >
              <LogoutIcon size={15} strokeWidth={2} />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
        {/* Mobil: yatay kaydırılabilir kompakt menü (sidebar masaüstünde) */}
        {business && (
          <div className="border-t border-line/60 md:hidden">
            <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap transition-colors hover:text-paprika ${isNavItemActive(pathname, item) ? "text-paprika" : ""
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-5">
        {/* Masaüstü: sol sidebar */}
        {business && (
          <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-52 shrink-0 overflow-y-auto py-8 md:block">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-colors ${active
                        ? "bg-paprika/10 font-semibold text-paprika"
                        : "text-ink-soft hover:bg-crema/70 hover:text-ink"
                      }`}
                  >
                    <item.Icon size={17} strokeWidth={active ? 2.1 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}
        <main className="min-w-0 flex-1 py-10">
          <TrialBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/panel/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-ink-soft">Yükleniyor…</div>;
  }

  return (
    <BusinessProvider>
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </BusinessProvider>
  );
}
