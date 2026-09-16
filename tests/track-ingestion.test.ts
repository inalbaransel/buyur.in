import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Event toplama uçunun sözleşmesi: istemci yalnızca "ne oldu"yu söyler; kim,
// nereden, hangi cihaz bilgisini sunucu üretir. Sahte event üretilememeli ve
// hiçbir hata menüyü bozmamalı.

let hasCredentials = true;
const created: { collection: string; data: Record<string, unknown> }[] = [];
const sessionRecords: Record<string, unknown>[] = [];

vi.mock("@/lib/pocketbase-server", () => ({
  hasServiceCredentials: () => hasCredentials,
  getServicePB: async () => ({
    filter: (expression: string, params?: Record<string, unknown>) =>
      `${expression}::${JSON.stringify(params ?? {})}`,
    collection: (name: string) => ({
      getFirstListItem: async () => {
        if (name === "buyur_businesses") return { id: "biz_000000000001" };
        throw Object.assign(new Error("not found"), { status: 404 });
      },
      getList: async () => ({ totalItems: 0, items: [] }),
      create: async (data: Record<string, unknown>) => {
        created.push({ collection: name, data });
        const record = { id: `rec_${created.length}`, ...data };
        if (name === "buyur_sessions") sessionRecords.push(record);
        return record;
      },
      update: async (id: string, data: Record<string, unknown>) => ({ id, ...data }),
    }),
  }),
}));

const { POST } = await import("@/app/api/track/route");

function trackRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://vezirhan.buyur.in/api/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  hasCredentials = true;
  created.length = 0;
  sessionRecords.length = 0;
});

describe("/api/track doğrulama", () => {
  it("gövde geçersizse 400", async () => {
    const response = await POST(trackRequest({ slug: "", type: "page_view" }, { "x-forwarded-for": "10.0.0.1" }));
    expect(response.status).toBe(400);
  });

  it("bilinmeyen event tipi reddedilir", async () => {
    const response = await POST(
      trackRequest({ slug: "vezirhan", type: "drop_table" }, { "x-forwarded-for": "10.0.0.2" })
    );
    expect(response.status).toBe(400);
    expect(created).toHaveLength(0);
  });

  it("sunucuya ait event'ler istemciden gönderilemez", async () => {
    for (const type of ["qr_scan", "session_start", "session_end"]) {
      const response = await POST(trackRequest({ slug: "vezirhan", type }, { "x-forwarded-for": "10.0.0.3" }));
      expect(response.status).toBe(400);
    }
    expect(created).toHaveLength(0);
  });

  it("servis hesabı yoksa sessizce devre dışı kalır (menü bozulmaz)", async () => {
    hasCredentials = false;
    const response = await POST(
      trackRequest({ slug: "vezirhan", type: "page_view" }, { "x-forwarded-for": "10.0.0.4" })
    );
    expect(response.status).toBe(204);
    expect(created).toHaveLength(0);
  });
});

describe("/api/track sunucu tarafı zenginleştirme", () => {
  it("oturum, kaynak ve cihaz sunucuda üretilir; QR taraması ayrıca kaydedilir", async () => {
    const response = await POST(
      trackRequest(
        {
          slug: "vezirhan",
          type: "page_view",
          target: "menu",
          label: "Menü",
          locale: "tr",
          entry: { qr: "masa-01", referrer: "https://instagram.com/x", path: "/" },
        },
        { "x-forwarded-for": "10.0.0.5", "x-vercel-ip-country": "TR", "x-vercel-ip-city": "%C4%B0stanbul" }
      )
    );

    expect(response.status).toBe(204);

    const session = created.find((item) => item.collection === "buyur_sessions")!;
    // QR parametresi referrer'ın önüne geçer.
    expect(session.data.source).toBe("qr");
    expect(session.data.device).toBe("mobile");
    expect(session.data.country).toBe("TR");
    expect(session.data.city).toBe("İstanbul");

    const events = created.filter((item) => item.collection === "buyur_events");
    const types = events.map((item) => item.data.type);
    expect(types).toContain("session_start");
    expect(types).toContain("qr_scan");
    expect(types).toContain("page_view");

    // Oturum çerezi yanıt ile geri döner.
    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain("mv_sid=");
  });

  it("meta yalnızca küçük ve düz değerleri kabul eder", async () => {
    await POST(
      trackRequest(
        {
          slug: "vezirhan",
          type: "search",
          target: "burger",
          meta: {
            results: 3,
            no_result: false,
            "kötü anahtar": "x",
            nested: { a: 1 },
            uzun: "y".repeat(500),
          },
        },
        { "x-forwarded-for": "10.0.0.6" }
      )
    );

    const searchEvent = created.find(
      (item) => item.collection === "buyur_events" && item.data.type === "search"
    )!;
    const meta = searchEvent.data.meta as Record<string, unknown>;
    expect(meta.results).toBe(3);
    expect(meta.no_result).toBe(false);
    expect(meta["kötü anahtar"]).toBeUndefined();
    expect(meta.nested).toBeUndefined();
    expect((meta.uzun as string).length).toBe(120);
  });

  it("aynı IP'den dakikada 120 event üstü sınırlanır", async () => {
    const ip = "10.0.0.99";
    let lastStatus = 0;
    for (let index = 0; index < 130; index += 1) {
      const response = await POST(trackRequest({ slug: "vezirhan", type: "page_view" }, { "x-forwarded-for": ip }));
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });
});
