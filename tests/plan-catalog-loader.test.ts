import { afterEach, describe, expect, it, vi } from "vitest";
import { entitlementsFor, resetPlanCatalog } from "@/lib/entitlements";
import { planPricing } from "@/lib/pricing";
import { PLAN_CATALOG_TTL_MS, ensurePlanCatalog, resetPlanCatalogCache } from "@/lib/plan-catalog-loader";

function fakeClient(impl: () => Promise<unknown[]>) {
  const getFullList = vi.fn(impl);
  return { client: { collection: () => ({ getFullList }) } as never, getFullList };
}

afterEach(() => {
  resetPlanCatalog();
  resetPlanCatalogCache();
});

describe("ensurePlanCatalog", () => {
  it("kayıtları okuyup canlı kataloğa uygular", async () => {
    const { client } = fakeClient(async () => [{ key: "freemium", trial_months: 1, limits: { menu_views: 9000 } }]);
    await ensurePlanCatalog(client, 1_000);
    expect(entitlementsFor("freemium").limits.menuViews).toBe(9_000);
  });

  it("TTL içinde yeniden okumaz (menü açılışına ek tur binmesin)", async () => {
    const { client, getFullList } = fakeClient(async () => [{ key: "freemium", limits: {} }]);
    await ensurePlanCatalog(client, 1_000);
    await ensurePlanCatalog(client, 1_000 + PLAN_CATALOG_TTL_MS - 1);
    expect(getFullList).toHaveBeenCalledTimes(1);

    await ensurePlanCatalog(client, 1_000 + PLAN_CATALOG_TTL_MS + 1);
    expect(getFullList).toHaveBeenCalledTimes(2);
  });

  it("aynı anda gelen istekler tek okumayı paylaşır", async () => {
    const { client, getFullList } = fakeClient(async () => [{ key: "freemium", limits: {} }]);
    await Promise.all([ensurePlanCatalog(client, 5_000), ensurePlanCatalog(client, 5_000), ensurePlanCatalog(client, 5_000)]);
    expect(getFullList).toHaveBeenCalledTimes(1);
  });

  it("okuma hatasında sessizce yedeğe düşer ve bir sonraki istekte yeniden dener", async () => {
    let fail = true;
    const { client, getFullList } = fakeClient(async () => {
      if (fail) throw new Error("503");
      return [{ key: "freemium", limits: { menu_views: 1234 } }];
    });

    await expect(ensurePlanCatalog(client, 10_000)).resolves.toBeUndefined();
    expect(entitlementsFor("freemium").limits.menuViews).toBe(5_000); // yedek

    fail = false;
    await ensurePlanCatalog(client, 10_001); // hata zaman damgası bırakmadı
    expect(getFullList).toHaveBeenCalledTimes(2);
    expect(entitlementsFor("freemium").limits.menuViews).toBe(1_234);
  });

  it("boş liste yedeği ezmez", async () => {
    const { client } = fakeClient(async () => []);
    await ensurePlanCatalog(client, 20_000);
    expect(entitlementsFor("premium").limits.aiScansPerMonth).toBe(5);
  });

  it("fiyatları da yükler; okuma hatasında son bilinen fiyat korunur", async () => {
    let fail = false;
    const { client } = fakeClient(async () => {
      if (fail) throw new Error("503");
      return [{ key: "premium", price_monthly: 300, price_yearly_monthly: 240, limits: {} }];
    });

    await ensurePlanCatalog(client, 30_000);
    expect(planPricing("premium")).toEqual({ monthly: 300, yearlyMonthly: 240 });

    fail = true;
    await ensurePlanCatalog(client, 30_000 + PLAN_CATALOG_TTL_MS + 1);
    expect(planPricing("premium")).toEqual({ monthly: 300, yearlyMonthly: 240 });
  });
});
