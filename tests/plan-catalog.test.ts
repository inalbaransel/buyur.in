import { describe, expect, it } from "vitest";
import { PLAN_SEEDS } from "../scripts/plan-catalog.mjs";
import { PLAN_PRICING, yearlyDiscountPercent, yearlyTotal, formatTL } from "@/lib/pricing";
import { PLAN_ENTITLEMENTS, PLAN_ORDER } from "@/lib/entitlements";

// Landing'deki fiyat kartları bu katalogdan okunuyor (components/pricing-plans.tsx);
// toplantıdaki P0 kararı: sayfanın hiçbir yerinde plan/ürün sınırı/özellik çelişkisi
// kalmasın. Ürünün bugün yapmadığı işler kataloğa giremez.
describe("paket kataloğunun vaatleri", () => {
  it("olmayan bir özelliği vaat etmez", () => {
    const forbidden = [/sipariş yönetimi/i, /\bAPI\b/, /maksimum \d+ ürün/i, /white label/i, /güvenlik araç/i, /ekip yönetimi/i];
    for (const seed of PLAN_SEEDS) {
      for (const feature of [seed.description, ...seed.features]) {
        for (const pattern of forbidden) expect(feature, `${seed.key}: ${feature}`).not.toMatch(pattern);
      }
    }
  });

  it("veritabanı limitleri yetki matrisiyle çelişmez", () => {
    for (const seed of PLAN_SEEDS) {
      const features = PLAN_ENTITLEMENTS[seed.key as keyof typeof PLAN_ENTITLEMENTS].features;
      expect(seed.limits.analytics, `${seed.key} analytics`).toBe(features.basic_analytics);
      expect(seed.limits.campaigns, `${seed.key} campaigns`).toBe(features.campaigns);
      expect(seed.limits.custom_domain, `${seed.key} custom_domain`).toBe(features.custom_domain);
      expect(seed.limits.branding_removal, `${seed.key} branding_removal`).toBe(features.branding_removal);
      expect(seed.limits.api_access, `${seed.key} api_access`).toBe(false);
    }
  });
});

// Fiyat üç yerde yaşıyor: lib/pricing.ts (siteye ilan edilen), plan-catalog.mjs
// (veritabanına yazılan) ve PocketBase kaydı. İlk ikisi burada kilitleniyor;
// üçüncüsü scripts/migrate-plan-pricing.mjs ile ikinciden türetiliyor.

describe("paket kataloğu ile ilan edilen fiyat", () => {
  it("her plan için katalog ve site aynı rakamı söyler", () => {
    for (const plan of PLAN_ORDER) {
      const seed = PLAN_SEEDS.find((entry) => entry.key === plan);
      expect(seed, `${plan} katalogda yok`).toBeDefined();
      expect(seed!.price_monthly).toBe(PLAN_PRICING[plan].monthly);
      expect(seed!.price_yearly_monthly).toBe(PLAN_PRICING[plan].yearlyMonthly);
    }
  });

  it("hiçbir planda ürün limiti yok (Freemium dahil)", () => {
    for (const seed of PLAN_SEEDS) {
      expect(seed.limits.max_products, `${seed.key} ürün limiti taşıyor`).toBeNull();
    }
  });

  it("yalnızca Freemium süreli", () => {
    for (const seed of PLAN_SEEDS) {
      expect(seed.trial_months).toBe(seed.key === "freemium" ? 3 : 0);
    }
  });

  it("yıllık ödeme %20 indirim ve beklenen toplamları verir", () => {
    expect(yearlyDiscountPercent(PLAN_PRICING.premium)).toBe(20);
    expect(yearlyDiscountPercent(PLAN_PRICING.elite)).toBe(20);

    // Toplantıda kararlaştırılan tablo — kuruşuna kadar.
    expect(formatTL(PLAN_PRICING.premium.monthly)).toBe("249₺");
    expect(formatTL(PLAN_PRICING.premium.yearlyMonthly)).toBe("199,20₺");
    expect(formatTL(yearlyTotal(PLAN_PRICING.premium))).toBe("2.390,40₺");
    expect(formatTL(PLAN_PRICING.premium.monthly * 12)).toBe("2.988₺");

    expect(formatTL(PLAN_PRICING.elite.monthly)).toBe("749₺");
    expect(formatTL(PLAN_PRICING.elite.yearlyMonthly)).toBe("599,20₺");
    expect(formatTL(yearlyTotal(PLAN_PRICING.elite))).toBe("7.190,40₺");
    expect(formatTL(PLAN_PRICING.elite.monthly * 12)).toBe("8.988₺");
  });
});
