import { describe, expect, it } from "vitest";
import {
  FEATURE_MATRIX,
  PLAN_ENTITLEMENTS,
  aiPeriodKey,
  aiUsage,
  entitlementsFor,
  freemiumUsage,
  isFeatureAvailable,
  isSubscriptionActive,
  requiredPlanFor,
} from "@/lib/entitlements";
import type { Business } from "@/lib/types";

// Abonelik kuralları tek kaynaktan geliyor; bu dosya o kaynağın sözleşmesidir.
// En kritik kural: 3 ay / 10.000 görüntülenme limitleri YALNIZCA Freemium'a ait.

const NOW = new Date("2026-08-16T12:00:00Z");

function business(overrides: Partial<Business> = {}): Business {
  return {
    plan: "freemium",
    freemium_started_at: "2026-08-01T00:00:00.000Z",
    plan_expires_at: "2026-11-01T00:00:00.000Z",
    menu_views: 0,
    ...overrides,
  } as Business;
}

describe("plan matrisi", () => {
  it("Freemium yalnızca menü ve temel analiz içerir", () => {
    const { features } = PLAN_ENTITLEMENTS.freemium;
    expect(features.menu).toBe(true);
    expect(features.basic_analytics).toBe(true);
    expect(features.advanced_analytics).toBe(false);
    expect(features.custom_website).toBe(false);
    expect(features.advanced_reports).toBe(false);
  });

  it("Premium web sitesi ve gelişmiş analiz açar, Elite raporları ekler", () => {
    expect(PLAN_ENTITLEMENTS.premium.features.custom_website).toBe(true);
    expect(PLAN_ENTITLEMENTS.premium.features.advanced_website).toBe(false);
    expect(PLAN_ENTITLEMENTS.premium.features.advanced_reports).toBe(false);

    expect(PLAN_ENTITLEMENTS.premium.features.gifted_website).toBe(false);

    expect(PLAN_ENTITLEMENTS.elite.features.advanced_website).toBe(true);
    // Hediye kurumsal site yalnızca Elite'e ait — paket vaadinin kod karşılığı.
    expect(PLAN_ENTITLEMENTS.elite.features.gifted_website).toBe(true);
    expect(PLAN_ENTITLEMENTS.elite.features.advanced_reports).toBe(true);
    expect(PLAN_ENTITLEMENTS.elite.features.report_export).toBe(true);
  });

  it("Freemium yalnızca süre ve görüntülenme ile sınırlıdır (ürün limiti yok)", () => {
    const { limits } = PLAN_ENTITLEMENTS.freemium;
    expect(limits.durationMonths).toBe(3);
    expect(limits.menuViews).toBe(10_000);
    // Limit sözlüğünde bir ürün/kategori sınırı KAVRAMI bile yok — ürün limiti
    // ürün kararı olarak kaldırıldı, "sonsuz sayı" yazarak değil.
    // (AI kotası ayrı bir eksen: kullanım hakkı, içerik sınırı değil.)
    expect(Object.keys(limits).sort()).toEqual([
      "aiPagesPerScan",
      "aiScansPerMonth",
      "durationMonths",
      "menuViews",
      "retentionDays",
    ]);
  });

  it("bir özelliğin gerektirdiği en düşük planı bilir", () => {
    expect(requiredPlanFor("custom_website")).toBe("premium");
    expect(requiredPlanFor("gifted_website")).toBe("elite");
    expect(requiredPlanFor("advanced_reports")).toBe("elite");
    expect(requiredPlanFor("menu")).toBe("freemium");
  });

  it("karşılaştırma tablosu matrisle tutarlı (pazarlama ile panel ayrışamaz)", () => {
    const websiteRow = FEATURE_MATRIX.find((row) => row.label.startsWith("Standart web sitesi"))!;
    expect(websiteRow.values.freemium).toBe(false);
    expect(websiteRow.values.premium).toBe(true);
    expect(websiteRow.values.elite).toBe(true);

    // Hediye site satırı Elite'te serbest metin ("Hediye") ile gösterilir.
    const giftedRow = FEATURE_MATRIX.find((row) => row.label.startsWith("Hediye kurumsal web sitesi"))!;
    expect(giftedRow.values.freemium).toBe(false);
    expect(giftedRow.values.premium).toBe(false);
    expect(giftedRow.values.elite).toBe("Hediye");

    const reportRow = FEATURE_MATRIX.find((row) => row.label === "Gelişmiş raporlar")!;
    expect(reportRow.values.premium).toBe(false);
    expect(reportRow.values.elite).toBe(true);
  });
});

describe("Freemium çift limiti", () => {
  it("iki limit de dolmadıysa abonelik aktif", () => {
    const usage = freemiumUsage(business({ menu_views: 2_840 }), NOW);
    expect(usage.limited).toBe(true);
    expect(usage.exhausted).toBe(false);
    expect(usage.daysLeft).toBe(77);
    expect(usage.menuViewLimit).toBe(10_000);
  });

  it("10.000 görüntülenmeye ulaşınca süre dolmadan biter", () => {
    const usage = freemiumUsage(business({ menu_views: 10_000 }), NOW);
    expect(usage.exhausted).toBe(true);
    expect(usage.reason).toBe("menu_views");
    expect(usage.daysLeft).toBeGreaterThan(0); // süre hâlâ vardı
  });

  it("3 ay dolunca görüntülenme az olsa da biter", () => {
    const expired = business({ plan_expires_at: "2026-08-01T00:00:00.000Z", menu_views: 7_500 });
    const usage = freemiumUsage(expired, NOW);
    expect(usage.exhausted).toBe(true);
    expect(usage.reason).toBe("duration");
  });

  it("uyarı eşikleri %50/75/90/100 olarak raporlanır", () => {
    expect(freemiumUsage(business({ menu_views: 1_000 }), NOW).warningThreshold).toBe(null);
    expect(freemiumUsage(business({ menu_views: 5_100 }), NOW).warningThreshold).toBe(50);
    expect(freemiumUsage(business({ menu_views: 7_600 }), NOW).warningThreshold).toBe(75);
    expect(freemiumUsage(business({ menu_views: 9_100 }), NOW).warningThreshold).toBe(90);
    expect(freemiumUsage(business({ menu_views: 10_000 }), NOW).warningThreshold).toBe(100);
  });
});

describe("ücretli planlarda Freemium limiti UYGULANMAZ", () => {
  for (const plan of ["premium", "elite"] as const) {
    it(`${plan}: süre ve görüntülenme sınırsız`, () => {
      const paid = business({
        plan,
        menu_views: 5_000_000,
        // Eski bir Freemium kaydından kalmış bitiş tarihi olsa bile etkilemez.
        plan_expires_at: "2020-01-01T00:00:00.000Z",
      });

      const usage = freemiumUsage(paid, NOW);
      expect(usage.limited).toBe(false);
      expect(usage.exhausted).toBe(false);
      expect(usage.menuViewLimit).toBeNull();
      expect(usage.daysLeft).toBeNull();

      expect(isSubscriptionActive(paid, NOW)).toBe(true);
      expect(entitlementsFor(plan).limits.durationMonths).toBeNull();
      expect(entitlementsFor(plan).limits.menuViews).toBeNull();
    });
  }
});

describe("özellik erişimi", () => {
  it("Freemium web sitesine erişemez, Premium erişir", () => {
    expect(isFeatureAvailable(business(), "custom_website", NOW)).toBe(false);
    expect(isFeatureAvailable(business({ plan: "premium" }), "custom_website", NOW)).toBe(true);
  });

  it("gelişmiş web sitesi yalnızca Elite'te", () => {
    expect(isFeatureAvailable(business({ plan: "premium" }), "advanced_website", NOW)).toBe(false);
    expect(isFeatureAvailable(business({ plan: "elite" }), "advanced_website", NOW)).toBe(true);
  });

  it("Freemium limiti dolunca menü dışındaki özellikler kilitlenir, menü verisi durur", () => {
    const exhausted = business({ menu_views: 10_000 });
    expect(isFeatureAvailable(exhausted, "basic_analytics", NOW)).toBe(false);
    // "menu" yeteneği plan seviyesinde açık kalır: veri silinmiyor, erişim kısıtlanıyor.
    expect(entitlementsFor("freemium").features.menu).toBe(true);
  });
});

// AI kotası ayrı bir eksen: Freemium'un süre/görüntülenme limitiyle karışmaz.
// Sayaç ay bazlıdır ve dönem değişince okuma anında sıfırlanır — sıfırlama
// için ayrı bir cron yok, bu yüzden "geçen ayın sayacı" testi kritik.
describe("AI kotası", () => {
  it("her plan AI araçlarına erişir, yalnızca hak sayısı değişir", () => {
    expect(PLAN_ENTITLEMENTS.freemium.features.ai_menu_import).toBe(true);
    expect(PLAN_ENTITLEMENTS.premium.features.ai_menu_import).toBe(true);
    expect(PLAN_ENTITLEMENTS.elite.features.ai_menu_import).toBe(true);

    expect(PLAN_ENTITLEMENTS.freemium.limits.aiScansPerMonth).toBe(3);
    expect(PLAN_ENTITLEMENTS.premium.limits.aiScansPerMonth).toBe(30);
    // Elite'te sınır yok — sayı yazmak yerine null.
    expect(PLAN_ENTITLEMENTS.elite.limits.aiScansPerMonth).toBeNull();
  });

  it("dönem anahtarı UTC ayına göre üretilir", () => {
    expect(aiPeriodKey(new Date("2026-08-16T12:00:00Z"))).toBe("2026-08");
    expect(aiPeriodKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });

  it("aynı dönemde kullanılan hak sayılır", () => {
    const usage = aiUsage({ plan: "freemium", ai_scans_used: 2, ai_scans_period: "2026-08" }, NOW);
    expect(usage.used).toBe(2);
    expect(usage.remaining).toBe(1);
    expect(usage.exhausted).toBe(false);
  });

  it("hak dolduğunda tarama kapanır", () => {
    const usage = aiUsage({ plan: "freemium", ai_scans_used: 3, ai_scans_period: "2026-08" }, NOW);
    expect(usage.exhausted).toBe(true);
    expect(usage.remaining).toBe(0);
  });

  it("geçen ayın sayacı bu ayı etkilemez", () => {
    const usage = aiUsage({ plan: "freemium", ai_scans_used: 3, ai_scans_period: "2026-07" }, NOW);
    expect(usage.used).toBe(0);
    expect(usage.exhausted).toBe(false);
    expect(usage.period).toBe("2026-08");
  });

  it("hiç kullanılmamış işletmede sayaç sıfırdır", () => {
    const usage = aiUsage({ plan: "premium" }, NOW);
    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(30);
  });

  it("Elite'te kota uygulanmaz", () => {
    const usage = aiUsage({ plan: "elite", ai_scans_used: 999, ai_scans_period: "2026-08" }, NOW);
    expect(usage.limited).toBe(false);
    expect(usage.limit).toBeNull();
    expect(usage.remaining).toBeNull();
    expect(usage.exhausted).toBe(false);
  });

  it("sayfa sınırı plana göre artar", () => {
    expect(aiUsage({ plan: "freemium" }, NOW).pagesPerScan).toBe(5);
    expect(aiUsage({ plan: "premium" }, NOW).pagesPerScan).toBe(10);
    expect(aiUsage({ plan: "elite" }, NOW).pagesPerScan).toBe(20);
  });

  it("Freemium süresi dolduysa AI araçları da kapanır", () => {
    const expired = business({ plan_expires_at: "2026-07-01T00:00:00.000Z" });
    expect(isFeatureAvailable(expired, "ai_menu_import", NOW)).toBe(false);
    // Menü erişimi ise kapanmaz — veri silinmiyor, yalnızca yetenek kısıtlanıyor.
    expect(isFeatureAvailable(expired, "menu", NOW)).toBe(true);
  });
});
