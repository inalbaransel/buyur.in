"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  FolderIcon,
  GripIcon,
  LayoutIcon,
  MegaphoneIcon,
  PackageIcon,
  QrCodeIcon,
  TrendingUpIcon,
} from "@/components/icons";

// Landing'in panel bölümü: emoji kartları yerine panelin kendi ekranları
// (aynı bileşen dili, örnek işletme verisi). Solda sekmeli panel, sağda
// satın alma kararını etkileyen üç sonuç.

type TabKey = "menu" | "campaigns" | "analytics" | "qr";

const TABS: { key: TabKey; label: string }[] = [
  { key: "menu", label: "Menü yönetimi" },
  { key: "campaigns", label: "Kampanyalar" },
  { key: "analytics", label: "Analizler" },
  { key: "qr", label: "QR takibi" },
];

const SIDEBAR: { key: TabKey | null; label: string; Icon: (p: { size?: number }) => ReactNode }[] = [
  { key: null, label: "Genel bakış", Icon: LayoutIcon },
  { key: "analytics", label: "Analiz", Icon: TrendingUpIcon },
  { key: null, label: "Kategoriler", Icon: FolderIcon },
  { key: "menu", label: "Ürünler", Icon: PackageIcon },
  { key: "campaigns", label: "Kampanyalar", Icon: MegaphoneIcon },
  { key: "qr", label: "QR kodlar", Icon: QrCodeIcon },
];

const OUTCOMES = [
  {
    title: "Şefin önerilerini ve kampanyaları öne çıkarın.",
    desc: "Rozet, indirim etiketi ve açılış pop-up'ıyla kârlı ürünü müşterinin önüne koyun.",
  },
  {
    title: "Tükenen ürünü saniyeler içinde gizleyin.",
    desc: "“Satışta” anahtarını kapatın; ürün menüden anında kalkar, müşteri boşa heveslenmez.",
  },
  {
    title: "Hangi ürünün görüntülendiğini ve sepete eklendiğini görün.",
    desc: "Ürün, kategori ve QR bazında — neyi öne çıkaracağınıza veriyle karar verin.",
  },
];

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full ${on ? "bg-herb" : "bg-ink/20"}`}>
      <span className={`inline-block h-3 w-3 rounded-full bg-paper shadow ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
    </span>
  );
}

function MenuTab() {
  const rows = [
    { name: "Izgara Köfte", price: "285₺", badge: "Şefin önerisi", on: true, tone: "bg-[#c9794a]" },
    { name: "Mantarlı Risotto", price: "240₺", badge: null, on: true, tone: "bg-[#d8b98a]" },
    { name: "Kuzu Tandır", price: "420₺", badge: "Tükendi", on: false, tone: "bg-[#8a5a3c]" },
    { name: "Mevsim Salatası", price: "165₺", badge: "Yeni", on: true, tone: "bg-[#8fae6b]" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-extrabold">Ürünler</p>
        <span className="rounded-md bg-ink px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-paper">+ Yeni ürün</span>
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-ink-soft">Ana yemekler</p>
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.name} className={`flex items-center gap-2.5 rounded-xl border border-line bg-paper p-2.5 ${row.on ? "" : "opacity-60"}`}>
            <span className="text-ink-soft/50">
              <GripIcon size={13} />
            </span>
            <span className={`h-8 w-8 shrink-0 rounded-lg ${row.tone}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold">{row.name}</p>
              <p className="font-mono text-[10px] text-ink-soft">
                {row.price}
                {row.badge && (
                  <span className={`ml-1.5 rounded px-1 py-0.5 text-[8px] uppercase ${row.on ? "bg-paprika/10 text-paprika" : "bg-ink/10 text-ink-soft"}`}>
                    {row.badge}
                  </span>
                )}
              </p>
            </div>
            <span className="hidden font-mono text-[9px] uppercase tracking-wider text-ink-soft sm:inline">Satışta</span>
            <Toggle on={row.on} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignsTab() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-paper p-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-ink-soft">Ürün · Kampanya</p>
        <p className="mt-1.5 text-[12px] font-bold">San Sebastian</p>
        <p className="mt-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-soft">İndirim (%)</p>
        <p className="mt-1 rounded-lg border border-paprika px-2.5 py-1.5 font-mono text-[12px]">15</p>
        <p className="mt-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-soft">Etiket</p>
        <p className="mt-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px]">Haftanın tatlısı</p>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-crema/60 px-2.5 py-2">
          <span className="text-[11px]">Menüde görünüm</span>
          <span className="font-mono text-[11px]">
            <span className="text-ink-soft line-through">150₺</span> <span className="font-bold text-paprika">127,50₺</span>
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-paper p-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-soft">Açılış pop-up&apos;ı</p>
          <Toggle on />
        </div>
        <div className="mt-2.5 overflow-hidden rounded-xl bg-ink text-paper">
          <div className="h-14 bg-gradient-to-br from-paprika to-[#f0a24b]" aria-hidden />
          <div className="p-3">
            <p className="font-display text-[13px] font-bold">Happy hour 17:00–19:00</p>
            <p className="mt-0.5 text-[10px] text-paper/70">Tüm soğuk içeceklerde ikincisi yarı fiyatına.</p>
            <span className="mt-2 inline-block rounded-full bg-paprika px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider">
              Menüyü gör
            </span>
          </div>
        </div>
        <p className="mt-2 font-mono text-[9px] text-ink-soft">Bitiş: Pazar 23:59 · otomatik kapanır</p>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const funnel = [
    { label: "Menü açıldı", value: 100 },
    { label: "Ürün görüntülendi", value: 72 },
    { label: "Sepete eklendi", value: 31 },
    { label: "Sepet görüntülendi", value: 24 },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Menü görüntülenme", "2.380"],
          ["Sepete ekleme", "412"],
          ["QR tarama", "1.106"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-paper p-2.5">
            <p className="font-mono text-[8px] uppercase tracking-wider text-ink-soft">{label}</p>
            <p className="mt-1 font-display text-lg font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-line bg-paper p-3">
        <p className="text-[12px] font-bold">Müşteri yolculuğu</p>
        <div className="mt-2.5 space-y-2">
          {funnel.map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[10px] text-ink-soft">{step.label}</span>
              <span className="h-2.5 flex-1 rounded-full bg-crema">
                <span className="block h-full rounded-full bg-paprika" style={{ width: `${step.value}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-[10px]">%{step.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QrTab() {
  const tables = [
    ["Masa 1", 42, 18],
    ["Masa 2", 35, 11],
    ["Masa 3", 51, 24],
    ["Vitrin", 17, 4],
  ] as const;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-extrabold">QR kodlar</p>
        <span className="rounded-md border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider">Toplu PDF indir</span>
      </div>
      <p className="mt-2 rounded-lg bg-crema/60 px-2.5 py-2 text-[10px] text-ink-soft">
        Masa QR&apos;larını toplu oluştur: <span className="font-semibold text-ink">Masa 1 – 12</span>
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {tables.map(([name, scans, carts]) => (
          <div key={name} className="flex items-center gap-2.5 rounded-xl border border-line bg-paper p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-crema/40 text-ink">
              <QrCodeIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold">{name}</p>
              <p className="font-mono text-[9px] text-ink-soft">
                {scans} tarama · {carts} sepet
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelWindow({ tab }: { tab: TabKey }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-crema/30 shadow-[0_30px_60px_-30px_rgba(35,24,18,0.55)]">
      <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e0735a]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e6b453]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#7fb069]" aria-hidden />
        <span className="ml-3 truncate rounded-md bg-crema/70 px-3 py-1 font-mono text-[10px] text-ink-soft">
          buyur.in/panel
        </span>
      </div>
      <div className="flex">
        <aside className="hidden w-40 shrink-0 border-r border-line bg-paper/60 p-2.5 sm:block" aria-hidden>
          {SIDEBAR.map((item) => {
            const active = item.key === tab;
            return (
              <p
                key={item.label}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] ${
                  active ? "bg-paprika/10 font-semibold text-paprika" : "text-ink-soft"
                }`}
              >
                <item.Icon size={13} />
                {item.label}
              </p>
            );
          })}
        </aside>
        <div className="min-h-[330px] min-w-0 flex-1 p-4">
          {tab === "menu" && <MenuTab />}
          {tab === "campaigns" && <CampaignsTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "qr" && <QrTab />}
        </div>
      </div>
    </div>
  );
}

export function PanelShowcase() {
  const [tab, setTab] = useState<TabKey>("menu");

  return (
    <section id="panel" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
        <div className="order-2 lg:order-1">
          <div role="tablist" aria-label="Panel ekranları" className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((item) => {
              const active = item.key === tab;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.key)}
                  className={`shrink-0 rounded-full px-4 py-2 font-mono text-[12px] uppercase tracking-wider transition-colors ${
                    active ? "bg-ink text-paper" : "border border-line text-ink-soft hover:border-ink/40 hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div role="tabpanel" data-reveal>
            <PanelWindow tab={tab} />
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-ink-soft/80">
            Panelin kendi ekranları · örnek işletme verisi
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">Mutfağın arkası</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-[2.6rem] md:leading-[1.1]">
            Sadece menüyü değil, müşterinin seçimini yönetin.
          </h2>
          <ul className="mt-8 space-y-6">
            {OUTCOMES.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-herb" aria-hidden>
                  <CheckCircleIcon size={20} />
                </span>
                <div>
                  <p className="font-display text-lg font-bold leading-snug">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/panel/register"
            data-track="cta_click"
            data-track-location="panel_showcase"
            data-track-cta="create_free"
            className="mt-9 inline-flex rounded-md bg-ink px-7 py-3.5 font-mono text-[13px] uppercase tracking-wider text-paper transition-colors hover:bg-paprika"
          >
            Paneli ücretsiz dene
          </Link>
        </div>
      </div>
    </section>
  );
}
