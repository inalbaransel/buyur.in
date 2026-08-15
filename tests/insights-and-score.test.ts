import { describe, expect, it } from "vitest";
import { classifyProduct, computeBenchmarks, MIN_VIEWS_FOR_CLASSIFICATION } from "@/lib/analytics/opportunities";
import { computeMenuScore, MIN_SESSIONS_FOR_SCORE } from "@/lib/analytics/score";
import { buildInsights } from "@/lib/analytics/insights";
import { deriveOverview, type OverviewTotals } from "@/lib/analytics/query";

function totals(overrides: Partial<Record<string, number>> = {}): OverviewTotals {
  return deriveOverview(
    {
      sessions: 200,
      page_views: 600,
      product_views: 400,
      product_detail_views: 200,
      cart_adds: 60,
      duration_sum: 200 * 100,
      new_sessions: 150,
      returning_sessions: 50,
      bounced_sessions: 40,
      ...overrides,
    },
    120
  );
}

describe("ürün fırsat sınıflandırması", () => {
  const products = [
    { key: "a", label: "Çok görülen, çok dönüşen", views: 200, detail_views: 90, cart_adds: 60 },
    { key: "b", label: "Çok görülen, az dönüşen", views: 200, detail_views: 40, cart_adds: 4 },
    { key: "c", label: "Az görülen, çok dönüşen", views: 30, detail_views: 20, cart_adds: 12 },
    { key: "d", label: "Az görülen, az dönüşen", views: 25, detail_views: 5, cart_adds: 1 },
  ];
  const benchmarks = computeBenchmarks(products);

  it("dört köşeyi doğru etiketler", () => {
    expect(classifyProduct(products[0]!, benchmarks).kind).toBe("star");
    expect(classifyProduct(products[1]!, benchmarks).kind).toBe("leaky");
    expect(classifyProduct(products[2]!, benchmarks).kind).toBe("hidden_gem");
    expect(classifyProduct(products[3]!, benchmarks).kind).toBe("underperformer");
  });

  it("örneklem küçükse sınıflandırma yapmaz", () => {
    const result = classifyProduct(
      { key: "x", label: "Yeni", views: MIN_VIEWS_FOR_CLASSIFICATION - 1, detail_views: 3, cart_adds: 3 },
      benchmarks
    );
    expect(result.kind).toBe("insufficient");
    expect(result.recommendation).toBeNull();
  });

  it("medyan kullanır: tek bir uç ürün diğerlerini aşağı çekmez", () => {
    const withOutlier = [...products, { key: "viral", label: "Viral", views: 5000, detail_views: 2000, cart_adds: 900 }];
    const outlierBenchmarks = computeBenchmarks(withOutlier);
    // Ortalama alsaydık medyan 200'ün çok üstüne çıkar ve "a" düşük görülürdü.
    expect(classifyProduct(products[0]!, outlierBenchmarks).kind).toBe("star");
  });
});

describe("menü performans skoru", () => {
  it("yetersiz örneklemde puan üretmez", () => {
    const score = computeMenuScore({
      totals: totals({ sessions: MIN_SESSIONS_FOR_SCORE - 1 }),
      previousSessions: null,
      productCoverage: { viewed: 10, total: 20 },
    });
    expect(score.sufficient).toBe(false);
    expect(score.score).toBeNull();
  });

  it("bileşenleri şeffaf döner ve ağırlıklar toplamı 1'dir", () => {
    const score = computeMenuScore({
      totals: totals(),
      previousSessions: 180,
      productCoverage: { viewed: 14, total: 20 },
    });

    expect(score.score).toBeGreaterThan(0);
    expect(score.components).toHaveLength(6);
    expect(score.components.reduce((sum, component) => sum + component.weight, 0)).toBeCloseTo(1);
    for (const component of score.components) {
      expect(component.hint.length).toBeGreaterThan(10); // her bileşen kendini açıklar
      expect(component.score).toBeGreaterThanOrEqual(0);
      expect(component.score).toBeLessThanOrEqual(100);
    }
  });

  it("karşılaştırma yoksa büyüme bileşeni nötr sayılır", () => {
    const score = computeMenuScore({
      totals: totals(),
      previousSessions: null,
      productCoverage: { viewed: 14, total: 20 },
    });
    expect(score.components.find((component) => component.key === "growth")!.score).toBe(50);
  });
});

describe("otomatik içgörüler", () => {
  const base = {
    products: [],
    categories: [],
    previousProducts: new Map<string, number>(),
    sources: [],
    previousSources: new Map<string, number>(),
    searches: [],
    peak: null,
    productLabels: new Map<string, string>(),
    categoryLabels: new Map<string, string>(),
  };

  it("küçük dalgalanmayı içgörü saymaz", () => {
    const insights = buildInsights({
      ...base,
      totals: totals({ page_views: 610 }),
      previous: totals({ page_views: 600 }),
    });
    expect(insights.find((insight) => insight.id === "views_trend")).toBeUndefined();
  });

  it("örneklem küçükse trend içgörüsü üretmez", () => {
    const insights = buildInsights({
      ...base,
      totals: totals({ sessions: 10, page_views: 100 }),
      previous: totals({ sessions: 8, page_views: 40 }),
    });
    expect(insights.find((insight) => insight.id === "views_trend")).toBeUndefined();
  });

  it("anlamlı artışı pozitif içgörü olarak verir ve kanıt taşır", () => {
    const insights = buildInsights({
      ...base,
      totals: totals({ page_views: 900 }),
      previous: totals({ page_views: 600 }),
    });
    const trend = insights.find((insight) => insight.id === "views_trend");
    expect(trend?.kind).toBe("positive");
    expect(trend?.evidence).toContain("900");
  });

  it("sonuçsuz aramayı fırsat olarak öne çıkarır", () => {
    const insights = buildInsights({
      ...base,
      totals: totals(),
      previous: null,
      searches: [{ key: "lahmacun", label: "lahmacun", metrics: { searches: 12, no_results: 12 } }],
    });
    expect(insights.some((insight) => insight.id.startsWith("search_no_result"))).toBe(true);
  });
});
