import { beforeEach, describe, expect, it, vi } from "vitest";

// Kiracı (tenant) izolasyonu ve plan yetkisi — bu dosyadaki testler güvenlik
// testidir: B işletmesinin verisini A kullanıcısı olarak istemek MUTLAKA
// başarısız olmalı.

const CURRENT_USER = "user_a_00000001";
const OTHER_BUSINESS = "biz_b_000000001";

let authShouldFail = false;
let ownedBusinesses: { id: string; name: string; plan: string }[] = [];
let memberships: { business: string; role: string; expand?: unknown }[] = [];
let planLimits: Record<string, unknown> = {};

vi.mock("pocketbase", () => {
  class FakePocketBase {
    authStore = { save: () => undefined, isValid: true, token: "t", record: null };
    filter(expression: string, params?: Record<string, unknown>) {
      return `${expression}::${JSON.stringify(params ?? {})}`;
    }
    collection() {
      return {
        authRefresh: async () => {
          if (authShouldFail) throw new Error("invalid token");
          return { record: { id: CURRENT_USER, email: "a@example.com" } };
        },
      };
    }
  }
  return { default: FakePocketBase };
});

vi.mock("@/lib/pocketbase-server", () => ({
  hasServiceCredentials: () => true,
  getServicePB: async () => ({
    filter: (expression: string, params?: Record<string, unknown>) =>
      `${expression}::${JSON.stringify(params ?? {})}`,
    collection: (name: string) => ({
      getFullList: async () => {
        if (name === "menuva_businesses") return ownedBusinesses;
        if (name === "menuva_business_members") return memberships;
        return [];
      },
      getFirstListItem: async () => {
        if (name === "menuva_plans") return { key: "premium", limits: planLimits };
        throw new Error("not found");
      },
    }),
  }),
}));

const { AccessError, clearAnalyticsContextCache, resolveAnalyticsContext } = await import("@/lib/analytics/access");

function request(token = "test-token"): Request {
  return new Request("https://menuvaapp.com/api/analytics/overview", {
    headers: { authorization: `Bearer ${token}` },
  });
}

const PREMIUM_LIMITS = {
  analytics: true,
  analytics_advanced: true,
  insights: true,
  reports: false,
  reports_export: false,
};

const ELITE_LIMITS = { ...PREMIUM_LIMITS, reports: true, reports_export: true };

beforeEach(() => {
  // Bağlam önbelleği süreç ömrü boyunca yaşıyor; testler birbirinin durumunu
  // görmesin diye her senaryodan önce temizliyoruz.
  clearAnalyticsContextCache();
  authShouldFail = false;
  ownedBusinesses = [{ id: "biz_a_000000001", name: "Alpha Cafe", plan: "premium" }];
  memberships = [];
  planLimits = PREMIUM_LIMITS;
});

describe("kimlik doğrulama", () => {
  it("token yoksa 401", async () => {
    const anonymous = new Request("https://menuvaapp.com/api/analytics/overview");
    await expect(resolveAnalyticsContext(anonymous)).rejects.toMatchObject({ status: 401 });
  });

  it("geçersiz token 401", async () => {
    authShouldFail = true;
    await expect(resolveAnalyticsContext(request())).rejects.toBeInstanceOf(AccessError);
    await expect(resolveAnalyticsContext(request())).rejects.toMatchObject({ status: 401, code: "unauthenticated" });
  });
});

describe("kiracı izolasyonu", () => {
  it("sahibi olduğu işletmeyi token'dan çözer", async () => {
    const context = await resolveAnalyticsContext(request());
    expect(context.business.id).toBe("biz_a_000000001");
    expect(context.role).toBe("owner");
  });

  it("BAŞKASININ işletme kimliğini isterse 403 — istemciden gelen id'ye asla güvenilmez", async () => {
    await expect(resolveAnalyticsContext(request(), OTHER_BUSINESS)).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
  });

  it("hiç işletmesi ve üyeliği olmayan kullanıcı veri alamaz", async () => {
    ownedBusinesses = [];
    await expect(resolveAnalyticsContext(request())).rejects.toMatchObject({ status: 404, code: "no_business" });
  });

  it("üyelik varsa yalnızca üye olunan işletme çözülür", async () => {
    ownedBusinesses = [];
    memberships = [
      {
        business: "biz_c_000000001",
        role: "manager",
        expand: { business: { id: "biz_c_000000001", name: "Gamma", plan: "premium" } },
      },
    ];

    const context = await resolveAnalyticsContext(request());
    expect(context.business.id).toBe("biz_c_000000001");
    expect(context.role).toBe("manager");

    // Üye olmadığı bir işletme istenirse yine reddedilir.
    await expect(resolveAnalyticsContext(request(), OTHER_BUSINESS)).rejects.toMatchObject({ status: 403 });
  });
});

describe("plan ve rol yetkileri", () => {
  it("Premium sahibinde gelişmiş analiz açık, rapor kapalı", async () => {
    const context = await resolveAnalyticsContext(request());
    expect(context.permissions.has("analytics.view")).toBe(true);
    expect(context.permissions.has("analytics.advanced")).toBe(true);
    expect(context.permissions.has("reports.view")).toBe(false);
    expect(context.permissions.has("reports.export")).toBe(false);
  });

  it("Elite'te rapor ve dışa aktarma açılır", async () => {
    planLimits = ELITE_LIMITS;
    const context = await resolveAnalyticsContext(request());
    expect(context.permissions.has("reports.view")).toBe(true);
    expect(context.permissions.has("reports.export")).toBe(true);
  });

  it("Freemium'da gelişmiş analiz plan seviyesinde kapalı (rol ne olursa olsun)", async () => {
    planLimits = { analytics: true, analytics_advanced: false, insights: false };
    const context = await resolveAnalyticsContext(request());
    expect(context.permissions.has("analytics.view")).toBe(true);
    expect(context.permissions.has("analytics.advanced")).toBe(false);
  });

  it("personel rolü Elite planda bile yalnızca temel analizi görür", async () => {
    planLimits = ELITE_LIMITS;
    ownedBusinesses = [];
    memberships = [
      {
        business: "biz_c_000000001",
        role: "staff",
        expand: { business: { id: "biz_c_000000001", name: "Gamma", plan: "elite" } },
      },
    ];

    const context = await resolveAnalyticsContext(request());
    expect(context.permissions.has("analytics.view")).toBe(true);
    expect(context.permissions.has("analytics.advanced")).toBe(false);
    expect(context.permissions.has("reports.view")).toBe(false);
  });

  it("müdür raporu görür ama dışa aktaramaz", async () => {
    planLimits = ELITE_LIMITS;
    ownedBusinesses = [];
    memberships = [
      {
        business: "biz_c_000000001",
        role: "manager",
        expand: { business: { id: "biz_c_000000001", name: "Gamma", plan: "elite" } },
      },
    ];

    const context = await resolveAnalyticsContext(request());
    expect(context.permissions.has("reports.view")).toBe(true);
    expect(context.permissions.has("reports.export")).toBe(false);
  });
});

describe("bağlam önbelleği", () => {
  it("aynı token'da kimlik doğrulamayı tekrarlamaz", async () => {
    let authCalls = 0;
    const countingRequest = () => {
      authCalls += 1;
      return request();
    };

    const first = await resolveAnalyticsContext(countingRequest());
    const second = await resolveAnalyticsContext(countingRequest());

    // Aynı nesne dönüyorsa ikinci istek ağa çıkmamış demektir.
    expect(second).toBe(first);
    expect(authCalls).toBe(2); // istek nesnesi iki kez üretildi, çözümleme bir kez
  });

  it("FARKLI token aynı önbelleği kullanamaz (yetki sızıntısı olmaz)", async () => {
    const owner = await resolveAnalyticsContext(request("token-a"));
    expect(owner.business.id).toBe("biz_a_000000001");

    // Başka bir kullanıcının token'ı: kendi verisini çözmeli, öncekini değil.
    ownedBusinesses = [];
    memberships = [
      {
        business: "biz_c_000000001",
        role: "staff",
        expand: { business: { id: "biz_c_000000001", name: "Gamma", plan: "premium" } },
      },
    ];

    const other = await resolveAnalyticsContext(request("token-b"));
    expect(other.business.id).toBe("biz_c_000000001");
    expect(other.role).toBe("staff");
  });

  it("önbellek temizlenince yeni plan hemen yansır", async () => {
    const before = await resolveAnalyticsContext(request());
    expect(before.permissions.has("reports.view")).toBe(false);

    planLimits = ELITE_LIMITS;
    clearAnalyticsContextCache();

    const after = await resolveAnalyticsContext(request());
    expect(after.permissions.has("reports.view")).toBe(true);
  });
});
