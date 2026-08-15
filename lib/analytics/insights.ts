import type { DimensionEntry, OverviewTotals } from "@/lib/analytics/query";
import { MIN_VIEWS_FOR_CLASSIFICATION, classifyProduct, computeBenchmarks } from "@/lib/analytics/opportunities";

// Otomatik içgörüler. Kural: anlamsız içgörü üretme. Her içgörünün iki eşiği var —
// yeterli örneklem (az veriden çıkan yüzdeler gürültüdür) ve anlamlı büyüklük
// (küçük dalgalanma haber değil). Eşiği geçmeyen hiçbir şey ekrana çıkmaz.

export type InsightKind = "positive" | "opportunity" | "warning" | "recommendation";

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  /** İçgörünün dayandığı sayı — okuyucu isterse doğrulayabilsin. */
  evidence: string;
}

/** Trend içgörüsü için iki dönemde de gereken en az oturum sayısı. */
const MIN_SESSIONS_FOR_TREND = 30;
/** Anlamlı sayılan en küçük değişim. */
const MIN_CHANGE = 0.15;
/** Kaynak/kategori kıyasları için en az örneklem. */
const MIN_SEGMENT_SESSIONS = 20;

function percent(value: number): string {
  return `%${Math.abs(value * 100).toFixed(0)}`;
}

function changeOf(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export interface InsightInput {
  totals: OverviewTotals;
  previous: OverviewTotals | null;
  products: DimensionEntry[];
  categories: DimensionEntry[];
  previousProducts: Map<string, number>;
  sources: DimensionEntry[];
  previousSources: Map<string, number>;
  searches: DimensionEntry[];
  peak: { hour: number; weekday: number } | null;
  productLabels: Map<string, string>;
  categoryLabels: Map<string, string>;
}

const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const SOURCE_LABELS: Record<string, string> = {
  qr: "QR kod",
  instagram: "Instagram",
  google: "Google",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  youtube: "YouTube",
  campaign: "Kampanya linki",
  direct: "Doğrudan",
  other: "Diğer",
};

export function buildInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const { totals, previous } = input;

  // ─── Dönemsel trend ───
  if (previous && totals.sessions >= MIN_SESSIONS_FOR_TREND && previous.sessions >= MIN_SESSIONS_FOR_TREND) {
    const viewChange = changeOf(totals.page_views, previous.page_views);
    if (viewChange !== null && Math.abs(viewChange) >= MIN_CHANGE) {
      insights.push({
        id: "views_trend",
        kind: viewChange > 0 ? "positive" : "warning",
        title:
          viewChange > 0
            ? `Menü görüntülenmeniz ${percent(viewChange)} arttı`
            : `Menü görüntülenmeniz ${percent(viewChange)} düştü`,
        detail:
          viewChange > 0
            ? "Önceki döneme göre daha çok müşteri menünüzü açıyor."
            : "Önceki döneme göre menünüz daha az açılıyor. QR kodlarının yerini ve görünürlüğünü kontrol edin.",
        evidence: `${totals.page_views} görüntülenme (önceki dönem ${previous.page_views})`,
      });
    }

    const conversionChange = changeOf(totals.cart_conversion, previous.cart_conversion);
    if (conversionChange !== null && Math.abs(conversionChange) >= MIN_CHANGE) {
      insights.push({
        id: "conversion_trend",
        kind: conversionChange > 0 ? "positive" : "warning",
        title:
          conversionChange > 0
            ? `Sepet dönüşümü ${percent(conversionChange)} iyileşti`
            : `Sepet dönüşümü ${percent(conversionChange)} geriledi`,
        detail:
          conversionChange > 0
            ? "Menüyü açan müşterilerin daha büyük kısmı ürün seçiyor."
            : "Menüyü açanların daha azı sepete ürün ekliyor. Fiyat ve görsel güncellemelerini gözden geçirin.",
        evidence: `${(totals.cart_conversion * 100).toFixed(1)}% (önceki dönem ${(previous.cart_conversion * 100).toFixed(1)}%)`,
      });
    }
  }

  // ─── Kategori kıyası ───
  const businessConversion = totals.product_views > 0 ? totals.cart_adds / totals.product_views : 0;
  if (businessConversion > 0) {
    for (const category of input.categories) {
      const productViews = category.metrics.product_views ?? 0;
      const cartAdds = category.metrics.cart_adds ?? 0;
      if (productViews < MIN_SEGMENT_SESSIONS) continue;

      const conversion = cartAdds / productViews;
      const lift = (conversion - businessConversion) / businessConversion;
      if (lift >= 0.25) {
        insights.push({
          id: `category_strong_${category.key}`,
          kind: "opportunity",
          title: `${input.categoryLabels.get(category.key) ?? category.label} menü ortalamanızın ${percent(lift)} üzerinde dönüşüyor`,
          detail: "Bu kategoriyi menünün üst sırasına taşımak ya da kampanyaya dahil etmek satışı büyütebilir.",
          evidence: `${(conversion * 100).toFixed(1)}% dönüşüm (menü ortalaması ${(businessConversion * 100).toFixed(1)}%)`,
        });
        break; // en güçlü tek kategori yeter; liste kalabalıklaşmasın
      }
    }
  }

  // ─── Ürün fırsatları ───
  const productStats = input.products.map((entry) => ({
    key: entry.key,
    label: input.productLabels.get(entry.key) ?? entry.label,
    views: entry.metrics.views ?? 0,
    detail_views: entry.metrics.detail_views ?? 0,
    cart_adds: entry.metrics.cart_adds ?? 0,
  }));

  if (productStats.length >= 3) {
    const benchmarks = computeBenchmarks(productStats);

    const hiddenGem = productStats
      .filter((product) => classifyProduct(product, benchmarks).kind === "hidden_gem")
      .sort((a, b) => b.cart_adds / Math.max(1, b.views) - a.cart_adds / Math.max(1, a.views))[0];

    if (hiddenGem) {
      insights.push({
        id: `hidden_gem_${hiddenGem.key}`,
        kind: "recommendation",
        title: `${hiddenGem.label} yüksek dönüşümlü ama az görülüyor`,
        detail: "Menüde yukarı taşımak, popüler rozeti eklemek veya kampanyaya dahil etmek ilk denenecek adım.",
        evidence: `${hiddenGem.views} görüntülenme · ${((hiddenGem.cart_adds / Math.max(1, hiddenGem.views)) * 100).toFixed(0)}% dönüşüm`,
      });
    }

    const leaky = productStats
      .filter((product) => classifyProduct(product, benchmarks).kind === "leaky")
      .sort((a, b) => b.views - a.views)[0];

    if (leaky) {
      insights.push({
        id: `leaky_${leaky.key}`,
        kind: "warning",
        title: `${leaky.label} çok görüntüleniyor ama sepete girmiyor`,
        detail: "Fiyat, görsel ve açıklamayı gözden geçirin — ilgi var, ikna eksik.",
        evidence: `${leaky.views} görüntülenme · ${((leaky.cart_adds / Math.max(1, leaky.views)) * 100).toFixed(0)}% dönüşüm`,
      });
    }
  }

  // ─── Ürün bazlı düşüş ───
  for (const product of productStats) {
    if (product.views < MIN_VIEWS_FOR_CLASSIFICATION) continue;
    const previousViews = input.previousProducts.get(product.key) ?? 0;
    if (previousViews < MIN_VIEWS_FOR_CLASSIFICATION) continue;

    const change = changeOf(product.views, previousViews);
    if (change !== null && change <= -0.2) {
      insights.push({
        id: `product_drop_${product.key}`,
        kind: "warning",
        title: `${product.label} görüntülenmesi ${percent(change)} düştü`,
        detail: "Menüdeki konumu değişmiş ya da ilgi azalmış olabilir; kategori sırasını kontrol edin.",
        evidence: `${product.views} görüntülenme (önceki dönem ${previousViews})`,
      });
      break;
    }
  }

  // ─── Trafik kaynağı büyümesi ───
  for (const source of input.sources) {
    const sessions = source.metrics.sessions ?? 0;
    if (sessions < MIN_SEGMENT_SESSIONS) continue;
    const previousSessions = input.previousSources.get(source.key) ?? 0;
    if (previousSessions < MIN_SEGMENT_SESSIONS) continue;

    const change = changeOf(sessions, previousSessions);
    if (change !== null && change >= 0.25) {
      insights.push({
        id: `source_growth_${source.key}`,
        kind: "positive",
        title: `${SOURCE_LABELS[source.key] ?? source.label} trafiği ${percent(change)} arttı`,
        detail: "Bu kanal işe yarıyor — paylaşım sıklığını korumak mantıklı.",
        evidence: `${sessions} oturum (önceki dönem ${previousSessions})`,
      });
      break;
    }
  }

  // ─── Sonuçsuz aramalar ───
  const noResult = input.searches
    .filter((entry) => (entry.metrics.no_results ?? 0) >= 5)
    .sort((a, b) => (b.metrics.no_results ?? 0) - (a.metrics.no_results ?? 0))[0];

  if (noResult) {
    insights.push({
      id: `search_no_result_${noResult.key}`,
      kind: "opportunity",
      title: `"${noResult.label}" araması sonuç döndürmüyor`,
      detail: "Müşteriler menüde olmayan bir şey arıyor. Ürünü eklemek ya da adlandırmayı değiştirmek gerekebilir.",
      evidence: `${noResult.metrics.no_results ?? 0} sonuçsuz arama`,
    });
  }

  // ─── Yoğunluk ───
  if (input.peak && totals.sessions >= MIN_SESSIONS_FOR_TREND) {
    insights.push({
      id: "peak_time",
      kind: "recommendation",
      title: `En yoğun zaman: ${WEEKDAYS[input.peak.weekday] ?? ""} ${String(input.peak.hour).padStart(2, "0")}:00`,
      detail: "Kampanya ve duyurularınızı bu saatten hemen önce yayına almak en çok kişiye ulaşır.",
      evidence: `${totals.sessions} oturumun dağılımına göre`,
    });
  }

  return insights;
}
