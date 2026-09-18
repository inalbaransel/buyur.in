import { describe, expect, it } from "vitest";
import { isRetryableError, runPooled, withRetry } from "@/lib/pb-retry";

const noWait = async () => {};
const noJitter = () => 1;
const opts = { sleep: noWait, jitter: noJitter };

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

describe("isRetryableError", () => {
  it("sunucu ve ağ hatalarını geçici sayar", () => {
    expect(isRetryableError(httpError(503))).toBe(true);
    expect(isRetryableError(httpError(429))).toBe(true);
    expect(isRetryableError(httpError(0))).toBe(true);
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("doğrulama hatasını yeniden denemez", () => {
    expect(isRetryableError(httpError(400))).toBe(false);
    expect(isRetryableError(httpError(403))).toBe(false);
  });
});

describe("withRetry", () => {
  it("503 sonrası başarıya ulaşır", async () => {
    let calls = 0;
    const value = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw httpError(503);
      return "ok";
    }, opts);

    expect(value).toBe("ok");
    expect(calls).toBe(3);
  });

  it("kalıcı hatayı tek denemede bırakır", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw httpError(400);
      }, opts)
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("deneme hakkı bitince son hatayı fırlatır", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw httpError(503);
        },
        { ...opts, attempts: 3 }
      )
    ).rejects.toThrow();
    expect(calls).toBe(3);
  });
});

describe("runPooled", () => {
  it("eşzamanlılık sınırını aşmaz", async () => {
    let active = 0;
    let peak = 0;
    await runPooled(
      Array.from({ length: 25 }, (_, i) => i),
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
      },
      { ...opts, concurrency: 3 }
    );

    expect(peak).toBeLessThanOrEqual(3);
  });

  it("bir iş başarısız olsa da kalanları yazar", async () => {
    const results = await runPooled(
      [1, 2, 3, 4],
      async (n) => {
        if (n === 2) throw httpError(400);
        return n * 10;
      },
      { ...opts, concurrency: 2 }
    );

    expect(results.filter((r) => r.error)).toHaveLength(1);
    expect(results.filter((r) => !r.error).map((r) => r.value)).toEqual([10, 30, 40]);
  });

  it("sonuçları giriş sırasında tutar", async () => {
    const results = await runPooled([1, 2, 3], async (n) => n, { ...opts, concurrency: 3 });
    expect(results.map((r) => r.index)).toEqual([0, 1, 2]);
  });
});

// Asıl çift kayıt sebebi: 503 "yazılmadı" demek değil — kayıt oluşmuş ama yanıt
// yolda kaybolmuş olabilir. Körlemesine tekrar denemek aynı ürünü ikinci kez yazar.
describe("withRetry — çift kayıt koruması", () => {
  it("503 sonrası kayıt yazılmışsa ikinci kez yazmaz", async () => {
    let writes = 0;
    const value = await withRetry(
      async () => {
        writes += 1;
        throw httpError(503); // yazıldı ama yanıt kayboldu
      },
      { ...opts, verify: async () => ({ id: "urun1" }) }
    );

    expect(value).toEqual({ id: "urun1" });
    expect(writes).toBe(1);
  });

  it("kayıt gerçekten oluşmadıysa tekrar dener", async () => {
    let writes = 0;
    const value = await withRetry(
      async () => {
        writes += 1;
        if (writes < 2) throw httpError(503);
        return { id: "urun2" };
      },
      { ...opts, verify: async () => null }
    );

    expect(value).toEqual({ id: "urun2" });
    expect(writes).toBe(2);
  });

  it("doğrulama da okunamazsa normal tekrar akışına düşer", async () => {
    let writes = 0;
    const value = await withRetry(
      async () => {
        writes += 1;
        if (writes < 2) throw httpError(503);
        return { id: "urun3" };
      },
      {
        ...opts,
        verify: async () => {
          throw httpError(503);
        },
      }
    );

    expect(value).toEqual({ id: "urun3" });
    expect(writes).toBe(2);
  });

  it("son denemede bile önce kaydın oluşup oluşmadığına bakar", async () => {
    const value = await withRetry(
      async () => {
        throw httpError(503);
      },
      { ...opts, attempts: 1, verify: async () => ({ id: "urun4" }) }
    );

    expect(value).toEqual({ id: "urun4" });
  });
});
