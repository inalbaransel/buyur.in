"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/lib/use-auth";
import { useBusiness } from "@/components/panel/business-context";
import { isReservedSlug, slugify } from "@/lib/slug";
import { Button, Card, ErrorText, Input, Label, PageHeader, UpgradeNotice } from "@/components/panel/ui";
import { QrShare } from "@/components/panel/qr-share";
import { planLabels } from "@/lib/labels";
import { fetchPlanLimits } from "@/lib/plan-limits";
import { ROOT_DOMAIN, menuHost } from "@/lib/site";
import type { Business, MenuEvent, Plan, PlanRecord } from "@/lib/types";

function Onboarding() {
  const { user } = useAuth();
  const { setBusiness } = useBusiness();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");

    if (!slug) {
      setError("Menü adresi boş olamaz.");
      return;
    }
    if (isReservedSlug(slug)) {
      setError("Bu adres sisteme ayrılmış, başka bir tane seç.");
      return;
    }

    setLoading(true);
    try {
      // Varsayılan kayıt paketi admin panelinden değiştirilebilir (plans.is_default) —
      // burada sabit bir plan anahtarı gömmek yerine canlı değeri okuyoruz.
      let defaultPlan: Plan = "freemium";
      try {
        const plan = await pb.collection("menuva_plans").getFirstListItem<PlanRecord>("is_default = true");
        defaultPlan = plan.key;
      } catch {
        // plans koleksiyonu boşsa (ör. migrate-plans.mjs henüz çalıştırılmadıysa) sessizce
        // "freemium"a düşer — kayıt akışını bu yüzden kilitlemiyoruz.
      }

      const business = await pb.collection("menuva_businesses").create<Business>({
        owner: user.id,
        name,
        slug,
        template: "liste",
        plan: defaultPlan,
        is_active: true,
      });
      setBusiness(business);
    } catch (err) {
      if (err instanceof ClientResponseError && err.response?.data?.slug) {
        setError("Bu adres zaten kullanılıyor, başka bir isim dene.");
      } else {
        setError("Bir şeyler ters gitti, tekrar dene.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Hoş geldin 👋</h1>
      <p className="mt-2 text-sm text-ink-soft">Menünü oluşturmadan önce işletmeni tanıyalım.</p>
      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">İşletme adı</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alpha Cafe" />
          </div>
          <div>
            <Label htmlFor="slug">Menü adresi</Label>
            <div className="flex items-center gap-1 rounded-2xl border border-line bg-crema/40 px-4 py-2.5 text-sm">
              <input
                id="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                className="min-w-0 flex-1 bg-transparent text-right text-ink outline-none"
              />
              <span className="shrink-0 text-ink-soft">.{ROOT_DOMAIN}</span>
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={loading} className="w-full">
            Menümü oluştur
          </Button>
        </form>
      </Card>
    </div>
  );
}

const PAGE_VIEW_LABELS: Record<string, string> = {
  welcome: "Karşılama",
  menu: "Menü (kategoriler)",
  category: "Kategori sayfaları",
  product: "Ürün sayfaları",
  search: "Arama",
  degerlendir: "Değerlendirme",
};

function countBy(events: MenuEvent[], key: (e: MenuEvent) => string): Map<string, { count: number; label: string }> {
  const map = new Map<string, { count: number; label: string }>();
  for (const e of events) {
    const k = key(e);
    const entry = map.get(k) ?? { count: 0, label: e.label || k };
    entry.count += 1;
    map.set(k, entry);
  }
  return map;
}

function topOf(map: Map<string, { count: number; label: string }>, limit: number) {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function BarList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <Card>
      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Henüz veri yok.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 font-mono text-xs font-semibold">{item.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-crema">
                <div className="h-full rounded-full bg-paprika" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatsSection({ business }: { business: Business }) {
  const [events, setEvents] = useState<MenuEvent[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    pb.collection("menuva_events")
      .getFullList<MenuEvent>({
        filter: pb.filter("business = {:id} && created >= {:from}", { id: business.id, from }),
        requestKey: null,
        sort: "-created",
      })
      .then(setEvents)
      .catch(() => setUnavailable(true));
  }, [business.id]);

  if (unavailable) {
    return (
      <Card className="mt-8">
        <p className="text-sm text-ink-soft">
          İstatistikler henüz aktif değil — sunucuda <span className="font-mono">events</span> koleksiyonu bekleniyor
          (setup-pocketbase.mjs migration&apos;ını çalıştır).
        </p>
      </Card>
    );
  }

  if (!events) {
    return <p className="mt-8 text-sm text-ink-soft">İstatistikler yükleniyor…</p>;
  }

  const pageViews = events.filter((e) => e.type === "page_view");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayViews = pageViews.filter((e) => new Date(e.created) >= todayStart);
  const cartAdds = events.filter((e) => e.type === "add_to_cart");

  const pageItems = Array.from(countBy(pageViews, (e) => e.target).entries())
    .map(([target, { count }]) => ({ label: PAGE_VIEW_LABELS[target] ?? target, count }))
    .sort((a, b) => b.count - a.count);

  const topProducts = topOf(countBy(events.filter((e) => e.type === "product_view"), (e) => e.target), 8);
  const topCategories = topOf(countBy(events.filter((e) => e.type === "category_view"), (e) => e.target), 8);
  const topCartProducts = topOf(countBy(cartAdds, (e) => e.target), 8);

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold">Ziyaretçi istatistikleri</h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Son 30 gün</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Sayfa görüntülenme</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{pageViews.length}</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Bugün</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{todayViews.length}</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Sepete ekleme</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{cartAdds.length}</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BarList title="Sayfa kırılımı" items={pageItems} />
        <BarList title="En çok görüntülenen ürünler" items={topProducts} />
        <BarList title="En çok görüntülenen kategoriler" items={topCategories} />
        <BarList title="En çok sepete eklenenler" items={topCartProducts} />
      </div>
    </div>
  );
}

function Overview({ business }: { business: Business }) {
  const [counts, setCounts] = useState<{ categories: number; products: number } | null>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const [categories, products] = await Promise.all([
        pb.collection("menuva_categories").getList(1, 1, { filter: pb.filter("business = {:id}", { id: business.id }) }),
        pb.collection("menuva_products").getList(1, 1, { filter: pb.filter("business = {:id}", { id: business.id }) }),
      ]);
      if (!cancelled) {
        setCounts({ categories: categories.totalItems, products: products.totalItems });
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [business.id]);

  useEffect(() => {
    let cancelled = false;
    fetchPlanLimits(business.plan).then((limits) => {
      if (!cancelled) setAnalyticsAllowed(limits.analytics);
    });
    return () => {
      cancelled = true;
    };
  }, [business.plan]);

  return (
    <div>
      <PageHeader title={business.name} description={menuHost(business.slug)} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Kategori</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{counts?.categories ?? "—"}</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Ürün</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{counts?.products ?? "—"}</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Plan</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{planLabels[business.plan]}</p>
        </Card>
      </div>
      <QrShare business={business} />
      {analyticsAllowed === false ? (
        <div className="mt-10">
          <UpgradeNotice
            title="Ziyaretçi istatistikleri kilitli"
            description="Sayfa görüntülenme, en çok bakılan ürün/kategori gibi istatistikler mevcut planında yok. Görmek için planını yükselt."
          />
        </div>
      ) : (
        analyticsAllowed && <StatsSection business={business} />
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { business, isLoading } = useBusiness();

  if (isLoading) return null;
  if (!business) return <Onboarding />;
  return <Overview business={business} />;
}
