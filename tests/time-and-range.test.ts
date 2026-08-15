import { describe, expect, it } from "vitest";
import { addMonths, trialStatus } from "@/lib/plan-period";
import { businessTimezone, dayBoundsUtc, dayCount, dayKey, dayRange, shiftDay, zonedParts } from "@/lib/analytics/time";
import { changeRatio, comparisonRange, resolveRange } from "@/lib/analytics/range";

const business = (timezone?: string) => ({ timezone }) as { timezone?: string };

describe("işletme saat dilimi", () => {
  it("geçersiz saat diliminde varsayılana düşer", () => {
    expect(businessTimezone(business("Europe/Istanbul"))).toBe("Europe/Istanbul");
    expect(businessTimezone(business("Mars/Olympus"))).toBe("Europe/Istanbul");
    expect(businessTimezone(business(undefined))).toBe("Europe/Istanbul");
  });

  it("gün anahtarı sunucunun değil işletmenin saatine göre hesaplanır", () => {
    // 14 Ağustos 22:30 UTC → İstanbul'da 15 Ağustos 01:30
    const instant = new Date("2026-08-14T22:30:00Z");
    expect(dayKey(instant, "Europe/Istanbul")).toBe("2026-08-15");
    expect(dayKey(instant, "UTC")).toBe("2026-08-14");
  });

  it("saat kırılımı yerel saati verir", () => {
    expect(zonedParts(new Date("2026-08-14T22:30:00Z"), "Europe/Istanbul").hour).toBe(1);
  });

  it("gün sınırları yaz saati geçişinde de doğru", () => {
    const berlinDst = dayBoundsUtc("2026-03-29", "Europe/Berlin");
    expect(berlinDst.from.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    // Geçiş günü 23 saat sürer.
    expect((berlinDst.to.getTime() - berlinDst.from.getTime()) / 3_600_000).toBe(23);

    const kathmandu = dayBoundsUtc("2026-08-15", "Asia/Kathmandu");
    expect(kathmandu.from.toISOString()).toBe("2026-08-14T18:15:00.000Z");
  });

  it("gün aritmetiği uçları dahil eder", () => {
    expect(dayRange("2026-08-01", "2026-08-03")).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
    expect(dayCount("2026-08-01", "2026-08-31")).toBe(31);
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("tarih aralığı çözümlemesi", () => {
  const now = new Date("2026-08-15T09:00:00Z");
  const tz = "Europe/Istanbul";

  it("preset'leri işletme gününe göre çözer", () => {
    expect(resolveRange({ preset: "today" }, tz, now).range).toEqual({ from: "2026-08-15", to: "2026-08-15" });
    expect(resolveRange({ preset: "last_7" }, tz, now).range).toEqual({ from: "2026-08-09", to: "2026-08-15" });
    expect(resolveRange({ preset: "this_month" }, tz, now).range).toEqual({ from: "2026-08-01", to: "2026-08-15" });
    expect(resolveRange({ preset: "last_month" }, tz, now).range).toEqual({ from: "2026-07-01", to: "2026-07-31" });
    expect(resolveRange({ preset: "last_year" }, tz, now).range).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("geçersiz özel aralık son 30 güne düşer", () => {
    const result = resolveRange({ preset: "custom", from: "2026-08-20", to: "2026-08-01" }, tz, now);
    expect(result.preset).toBe("last_30");
    expect(result.range).toEqual({ from: "2026-07-17", to: "2026-08-15" });
  });

  it("gelecek tarih bugüne kırpılır", () => {
    const result = resolveRange({ preset: "custom", from: "2026-08-10", to: "2027-01-01" }, tz, now);
    expect(result.range.to).toBe("2026-08-15");
  });

  it("karşılaştırma dönemi eşit uzunlukta ve bitişik", () => {
    const range = { from: "2026-08-01", to: "2026-08-15" };
    expect(comparisonRange(range, "previous_period")).toEqual({ from: "2026-07-17", to: "2026-07-31" });
    expect(comparisonRange(range, "previous_year")).toEqual({ from: "2025-08-01", to: "2025-08-15" });
    expect(comparisonRange(range, "none")).toBeNull();
  });

  it("önceki dönem sıfırsa değişim oranı tanımsızdır", () => {
    expect(changeRatio(120, 0)).toBeNull();
    expect(changeRatio(120, 100)).toBeCloseTo(0.2);
  });
});

describe("deneme süresi", () => {
  it("ay eklerken karşılığı olmayan güne taşmaz", () => {
    expect(addMonths(new Date("2026-01-31T12:00:00Z"), 1).getUTCMonth()).toBe(1); // Şubat
    expect(addMonths(new Date("2026-01-31T12:00:00Z"), 1).getUTCDate()).toBe(28);
  });

  it("kalan gün ve bitiş durumu", () => {
    const now = new Date("2026-08-15T09:00:00Z");
    expect(trialStatus({ plan_expires_at: "2026-08-20 09:00:00.000Z" }, now)?.daysLeft).toBe(5);
    expect(trialStatus({ plan_expires_at: "2026-08-10 09:00:00.000Z" }, now)?.expired).toBe(true);
    expect(trialStatus({ plan_expires_at: "" }, now)).toBeNull();
  });
});
