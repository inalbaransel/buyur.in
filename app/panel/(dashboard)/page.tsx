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
import { fetchPlan, fetchPlanLimits } from "@/lib/plan-limits";
import { addMonths, trialStatus } from "@/lib/plan-period";
import { ROOT_DOMAIN, menuHost } from "@/lib/site";
import { AnalyticsError, fetchAnalytics } from "@/lib/analytics/panel-client";
import type { Business, Plan, PlanRecord } from "@/lib/types";

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
      let trialMonths = 0;
      try {
        const plan = await pb.collection("menuva_plans").getFirstListItem<PlanRecord>("is_default = true");
        defaultPlan = plan.key;
        trialMonths = plan.trial_months ?? 0;
      } catch {
        // plans koleksiyonu boşsa (ör. migrate-plans.mjs henüz çalıştırılmadıysa) sessizce
        // "freemium"a düşer — kayıt akışını bu yüzden kilitlemiyoruz. Süre de
        // yazılmaz: yanlış bir tarihle işletmeyi "süresi dolmuş" göstermektense
        // süresiz kabul etmek daha az zararlı.
      }

      const business = await pb.collection("menuva_businesses").create<Business>({
        owner: user.id,
        name,
        slug,
        template: "liste",
        plan: defaultPlan,
        // Deneme bitişi kayıt anında sabitleniyor: plan kaydındaki süre sonradan
        // değişse bile mevcut işletmenin hakkı değişmesin.
        plan_expires_at: trialMonths > 0 ? addMonths(new Date(), trialMonths).toISOString() : "",
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
  cart: "Sepet",
  degerlendir: "Değerlendirme",
};

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

interface OverviewSummary {
  totals: { page_views?: number; sessions?: number; visitors?: number; qr_scans?: number; cart_adds?: number };
  series: { page_views?: { date: string; value: number }[] };
  topProducts?: { key: string; label: string; metrics: Record<string, number> }[];
  topCategories?: { key: string; label: string; metrics: Record<string, number> }[];
}

/** Panel ana sayfasındaki özet. Daha önce burası son 30 günün TÜM ham
 *  event'lerini tarayıcıya çekiyordu (getFullList, sayfa sayfa) — veri
 *  büyüyünce onlarca megabayt ve düzinelerce istek anlamına geliyordu.
 *  Artık tek bir agregat isteği: /api/analytics/overview. */
function StatsSection({ business }: { business: Business }) {
  const [data, setData] = useState<OverviewSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setFailed(false);

    fetchAnalytics<OverviewSummary>("overview", { preset: "last_30", compare: "none" }, controller.signal)
      .then((response) => setData(response.data))
      .catch((err) => {
        // Sayfadan çıkınca istek iptal edilir; bu bir hata değil.
        if (controller.signal.aborted) return;
        if (err instanceof AnalyticsError && err.isPlanLocked) return;
        setFailed(true);
      });

    return () => controller.abort();
  }, [business.id]);

  if (failed) {
    return (
      <Card className="mt-8">
        <p className="text-sm text-ink-soft">
          İstatistikler şu anda yüklenemiyor. Birkaç dakika sonra tekrar deneyin.
        </p>
      </Card>
    );
  }

  if (!data) return <p className="mt-8 text-sm text-ink-soft">İstatistikler yükleniyor…</p>;

  const totals = data.totals ?? {};
  const series = data.series?.page_views ?? [];
  const todayViews = series.length > 0 ? (series[series.length - 1]?.value ?? 0) : 0;

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold">Ziyaretçi istatistikleri</h2>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Son 30 gün</span>
          <Link
            href="/panel/analytics"
            className="font-mono text-[11px] uppercase tracking-wider text-paprika transition-colors hover:text-paprika-deep"
          >
            Detaylı analiz →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Sayfa görüntülenme</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{totals.page_views ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Bugün</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{todayViews}</p>
        </Card>
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Sepete ekleme</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{totals.cart_adds ?? 0}</p>
        </Card>
      </div>

      {(data.topProducts || data.topCategories) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BarList
            title="En çok görüntülenen ürünler"
            items={(data.topProducts ?? []).map((item) => ({ label: item.label, count: item.metrics.views ?? 0 }))}
          />
          <BarList
            title="En çok görüntülenen kategoriler"
            items={(data.topCategories ?? []).map((item) => ({ label: item.label, count: item.metrics.views ?? 0 }))}
          />
        </div>
      )}
    </div>
  );
}

function Overview({ business }: { business: Business }) {
  const [counts, setCounts] = useState<{ categories: number; products: number } | null>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState<boolean | null>(null);
  const [isTrialPlan, setIsTrialPlan] = useState(false);
  // Süre sayacı yalnızca süreli planlarda anlamlı (ücretli plana geçince
  // kayıttaki eski bitiş tarihi sayaç göstermemeli).
  const trial = isTrialPlan ? trialStatus(business) : null;

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
    fetchPlan(business.plan).then((plan) => {
      if (!cancelled) setIsTrialPlan((plan?.trial_months ?? 0) > 0);
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
          {trial && (
            <p className={`mt-1 text-xs ${trial.expired ? "text-paprika" : "text-ink-soft"}`}>
              {trial.expired ? "Deneme süresi doldu" : `${trial.daysLeft} gün kaldı`}
            </p>
          )}
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
