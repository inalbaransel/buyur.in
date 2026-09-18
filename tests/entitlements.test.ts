import { afterEach, describe, expect, it } from "vitest";
import {
  applyPlanRecords,
  featureMatrix,
  freemiumLimits,
  resetPlanCatalog,
  DEFAULT_PLAN_ENTITLEMENTS,
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
// En kritik kural: 1 ay / 5.000 görüntülenme limitleri YALNIZCA Freemium'a ait.

const NOW = new Date("2026-08-16T12:00:00Z");

function business(overrides: Partial<Business> = {}): Business {
  return {
    plan: "freemium",
    freemium_started_at: "2026-08-01T00:00:00.000Z",
    plan_expires_at: "2026-09-01T00:00:00.000Z",
    menu_views: 0,
    ...overrides,
  } as Business;
}

describe("plan matrisi", () => {
  it("Freemium yalnızca menü ve temel analiz içerir", () => {
    const { features } = DEFAULT_PLAN_ENTITLEMENTS.freemium;
    expect(features.menu).toBe(true);
    expect(features.basic_analytics).toBe(true);
    expect(features.advanced_analytics).toBe(false);
    expect(features.website).toBe(false);
    expect(features.advanced_reports).toBe(false);
  });

  it("Web sitesi yalnızca Elite'e ait; Premium gelişmiş analiz açar, Elite raporları ekler", () => {
    expect(DEFAULT_PLAN_ENTITLEMENTS.premium.features.advanced_analytics).toBe(true);
    expect(DEFAULT_PLAN_ENTITLEMENTS.premium.features.website).toBe(false);
    expect(DEFAULT_PLAN_ENTITLEMENTS.premium.features.advanced_reports).toBe(false);

    expect(DEFAULT_PLAN_ENTITLEMENTS.elite.features.website).toBe(true);
    // "Kurumsal/hediye web sitesi" diye bir yetenek yok; sözlükte de bulunmamalı.
    expect(Object.keys(DEFAULT_PLAN_ENTITLEMENTS.elite.features)).not.toContain("gifted_website");
    expect(Object.keys(DEFAULT_PLAN_ENTITLEMENTS.elite.features)).not.toContain("advanced_website");
    expect(DEFAULT_PLAN_ENTITLEMENTS.elite.features.advanced_reports).toBe(true);
    expect(DEFAULT_PLAN_ENTITLEMENTS.elite.features.report_export).toBe(true);
  });

  it("Freemium yalnızca süre ve görüntülenme ile sınırlıdır (ürün limiti yok)", () => {
    const { limits } = DEFAULT_PLAN_ENTITLEMENTS.freemium;
    expect(limits.durationMonths).toBe(1);
    expect(limits.menuViews).toBe(5_000);
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
    expect(requiredPlanFor("website")).toBe("elite");
    expect(requiredPlanFor("advanced_reports")).toBe("elite");
    expect(requiredPlanFor("menu")).toBe("freemium");
  });

  it("karşılaştırma tablosu matrisle tutarlı (pazarlama ile panel ayrışamaz)", () => {
    const websiteRow = featureMatrix().find((row) => row.label.startsWith("Otomatik web sitesi"))!;
    expect(websiteRow.values.freemium).toBe(false);
    expect(websiteRow.values.premium).toBe(false);
    expect(websiteRow.values.elite).toBe(true);
    expect(featureMatrix().some((row) => /hediye|kurumsal/i.test(row.label))).toBe(false);

    const reportRow = featureMatrix().find((row) => row.label === "Gelişmiş raporlar")!;
    expect(reportRow.values.premium).toBe(false);
    expect(reportRow.values.elite).toBe(true);
  });
});

describe("Freemium çift limiti", () => {
  it("iki limit de dolmadıysa abonelik aktif", () => {
    const usage = freemiumUsage(business({ menu_views: 2_840 }), NOW);
    expect(usage.limited).toBe(true);
    expect(usage.exhausted).toBe(false);
    expect(usage.daysLeft).toBe(16);
    expect(usage.menuViewLimit).toBe(5_000);
  });

  it("5.000 görüntülenmeye ulaşınca süre dolmadan biter", () => {
    const usage = freemiumUsage(business({ menu_views: 5_000 }), NOW);
    expect(usage.exhausted).toBe(true);
    expect(usage.reason).toBe("menu_views");
    expect(usage.daysLeft).toBeGreaterThan(0); // süre hâlâ vardı
  });

  it("1 ay dolunca görüntülenme az olsa da biter", () => {
    const expired = business({ plan_expires_at: "2026-08-01T00:00:00.000Z", menu_views: 1_000 });
    const usage = freemiumUsage(expired, NOW);
    expect(usage.exhausted).toBe(true);
    expect(usage.reason).toBe("duration");
  });

  it("uyarı eşikleri %50/75/90/100 olarak raporlanır", () => {
    expect(freemiumUsage(business({ menu_views: 1_000 }), NOW).warningThreshold).toBe(null);
    expect(freemiumUsage(business({ menu_views: 2_600 }), NOW).warningThreshold).toBe(50);
    expect(freemiumUsage(business({ menu_views: 3_800 }), NOW).warningThreshold).toBe(75);
    expect(freemiumUsage(business({ menu_views: 4_600 }), NOW).warningThreshold).toBe(90);
    expect(freemiumUsage(business({ menu_views: 5_000 }), NOW).warningThreshold).toBe(100);
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
  it("web sitesi yalnızca Elite'te", () => {
    expect(isFeatureAvailable(business(), "website", NOW)).toBe(false);
    expect(isFeatureAvailable(business({ plan: "premium" }), "website", NOW)).toBe(false);
    expect(isFeatureAvailable(business({ plan: "elite" }), "website", NOW)).toBe(true);
  });

  it("Freemium limiti dolunca menü dışındaki özellikler kilitlenir, menü verisi durur", () => {
    const exhausted = business({ menu_views: 5_000 });
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
    expect(DEFAULT_PLAN_ENTITLEMENTS.freemium.features.ai_menu_import).toBe(true);
    expect(DEFAULT_PLAN_ENTITLEMENTS.premium.features.ai_menu_import).toBe(true);
    expect(DEFAULT_PLAN_ENTITLEMENTS.elite.features.ai_menu_import).toBe(true);

    expect(DEFAULT_PLAN_ENTITLEMENTS.freemium.limits.aiScansPerMonth).toBe(2);
    expect(DEFAULT_PLAN_ENTITLEMENTS.premium.limits.aiScansPerMonth).toBe(5);
    expect(DEFAULT_PLAN_ENTITLEMENTS.elite.limits.aiScansPerMonth).toBe(10);
  });

  it("dönem anahtarı UTC ayına göre üretilir", () => {
    expect(aiPeriodKey(new Date("2026-08-16T12:00:00Z"))).toBe("2026-08");
    expect(aiPeriodKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });

  it("aynı dönemde kullanılan hak sayılır", () => {
    const usage = aiUsage({ plan: "freemium", ai_scans_used: 1, ai_scans_period: "2026-08" }, NOW);
    expect(usage.used).toBe(1);
    expect(usage.remaining).toBe(1);
    expect(usage.exhausted).toBe(false);
  });

  it("hak dolduğunda tarama kapanır", () => {
    const usage = aiUsage({ plan: "freemium", ai_scans_used: 2, ai_scans_period: "2026-08" }, NOW);
    expect(usage.exhausted).toBe(true);
    expect(usage.remaining).toBe(0);
  });

  it("geçen ayın sayacı bu ayı etkilemez", () => {
    const usage = aiUsage({ plan: "freemium", ai_scans_used: 2, ai_scans_period: "2026-07" }, NOW);
    expect(usage.used).toBe(0);
    expect(usage.exhausted).toBe(false);
    expect(usage.period).toBe("2026-08");
  });

  it("hiç kullanılmamış işletmede sayaç sıfırdır", () => {
    const usage = aiUsage({ plan: "premium" }, NOW);
    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(5);
  });

  it("Elite'te de kota vardır (ayda 10)", () => {
    const usage = aiUsage({ plan: "elite", ai_scans_used: 10, ai_scans_period: "2026-08" }, NOW);
    expect(usage.limited).toBe(true);
    expect(usage.limit).toBe(10);
    expect(usage.remaining).toBe(0);
    expect(usage.exhausted).toBe(true);
  });

  it("tek taramada en fazla 5 sayfa (her planda)", () => {
    for (const plan of ["freemium", "premium", "elite"] as const) {
      expect(aiUsage({ plan }, NOW).pagesPerScan).toBe(5);
    }
  });

  it("Freemium süresi dolduysa AI araçları da kapanır", () => {
    const expired = business({ plan_expires_at: "2026-07-01T00:00:00.000Z" });
    expect(isFeatureAvailable(expired, "ai_menu_import", NOW)).toBe(false);
    // Menü erişimi ise kapanmaz — veri silinmiyor, yalnızca yetenek kısıtlanıyor.
    expect(isFeatureAvailable(expired, "menu", NOW)).toBe(true);
  });
});


// Kaynak `buyur_plans` kaydıdır; kod yalnızca yedek. Bu sözleşme "admin panelinde
// değişen rakam uygulamaya yansır, kayıt bozuksa plan kilitlenmez" der.
describe("canlı plan kataloğu (buyur_plans)", () => {
  afterEach(() => resetPlanCatalog());

  it("kayıt yüklenmemişse yedek değerler geçerli", () => {
    expect(entitlementsFor("freemium").limits.menuViews).toBe(5_000);
    expect(freemiumLimits().summary).toBe("1 ay veya 5.000 menü görüntülenmesi");
  });

  it("kayıttaki limit ve özellik değerleri yedeği ezer", () => {
    applyPlanRecords([
      { key: "freemium", trial_months: 2, limits: { menu_views: 8000, ai_scans_per_month: 4, website: true } },
    ]);

    const { limits, features } = entitlementsFor("freemium");
    expect(limits.durationMonths).toBe(2);
    expect(limits.menuViews).toBe(8_000);
    expect(limits.aiScansPerMonth).toBe(4);
    expect(features.website).toBe(true);
    expect(freemiumLimits().summary).toBe("2 ay veya 8.000 menü görüntülenmesi");
    // Kayıtta olmayan alan yedeğe düşer.
    expect(limits.retentionDays).toBe(90);
    expect(features.basic_analytics).toBe(true);
  });

  it("kayıttaki null 'sınırsız' demektir, yedeğe düşmez", () => {
    applyPlanRecords([{ key: "elite", trial_months: 0, limits: { ai_scans_per_month: null, menu_views: null } }]);
    expect(entitlementsFor("elite").limits.aiScansPerMonth).toBeNull();
  });

  it("özellik kapısı canlı kayda göre karar verir", () => {
    applyPlanRecords([{ key: "premium", trial_months: 0, limits: { website: true } }]);
    expect(isFeatureAvailable(business({ plan: "premium" }), "website", NOW)).toBe(true);
    expect(requiredPlanFor("website")).toBe("premium");
  });

  it("bozuk alanlar yedeğe düşer, plan kilitlenmez", () => {
    applyPlanRecords([
      { key: "premium", trial_months: "yok" as unknown as number, limits: { ai_scans_per_month: "çok", campaigns: "evet" } },
      { key: "bilinmeyen", limits: {} },
    ]);
    const { limits, features } = entitlementsFor("premium");
    expect(limits.aiScansPerMonth).toBe(5);
    expect(limits.durationMonths).toBeNull();
    expect(features.campaigns).toBe(true);
  });

  it("karşılaştırma tablosu canlı rakamları gösterir", () => {
    applyPlanRecords([{ key: "freemium", trial_months: 1, limits: { menu_views: 7000, ai_scans_per_month: 3 } }]);
    const views = featureMatrix().find((row) => row.label === "Menü görüntülenme")!;
    const ai = featureMatrix().find((row) => row.label.startsWith("Yapay zekâ ile fiziksel"))!;
    expect(views.values.freemium).toBe("7.000");
    expect(ai.values.freemium).toBe("Ayda 3 tarama");
  });
});
