import { describe, expect, it } from "vitest";
import { pruneEvents, retentionDaysFor } from "@/lib/analytics/retention";
import type { Business, PlanRecord } from "@/lib/types";

// Regresyon: ilk kurulumda retention temizliği, o günler agregata dönüşmeden
// eski event'leri sildi ve veri geri dönüşsüz kayboldu. Kural artık kesin:
// bir günün ham event'i, ancak o gün için agregat satırı varsa silinebilir.

const business = { id: "biz1", timezone: "Europe/Istanbul" } as Business;

function daysAgo(count: number): string {
  return new Date(Date.now() - count * 86_400_000).toISOString();
}

function dayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
}

/** Sahte PocketBase: agregatı olan günleri ve event'leri taşır, silinenleri kaydeder. */
function fakePb(options: { aggregatedDays: string[]; events: { id: string; occurred_at: string }[] }) {
  const deleted: string[] = [];

  return {
    deleted,
    filter: (expression: string, params?: Record<string, unknown>) =>
      `${expression}::${JSON.stringify(params ?? {})}`,
    collection: (name: string) => ({
      getFullList: async () => {
        if (name === "menuva_stats_daily") return options.aggregatedDays.map((date) => ({ date }));
        return [];
      },
      getList: async () => ({
        items: options.events,
        totalItems: options.events.length,
      }),
      delete: async (id: string) => {
        deleted.push(id);
      },
    }),
  };
}

describe("retention temizliği", () => {
  it("agregatı olmayan günün ham event'ini SİLMEZ", async () => {
    const oldEvent = { id: "e_old", occurred_at: daysAgo(120) };
    const pb = fakePb({ aggregatedDays: [], events: [oldEvent] });

    const deleted = await pruneEvents(pb as never, business, 30);

    expect(deleted).toBe(0);
    expect(pb.deleted).toEqual([]);
  });

  it("yalnızca hesaplanmış günlerin event'lerini siler", async () => {
    const aggregated = { id: "e_aggregated", occurred_at: daysAgo(120) };
    const orphan = { id: "e_orphan", occurred_at: daysAgo(119) };
    const pb = fakePb({
      aggregatedDays: [dayOf(aggregated.occurred_at)],
      events: [aggregated, orphan],
    });

    const deleted = await pruneEvents(pb as never, business, 30);

    expect(deleted).toBe(1);
    expect(pb.deleted).toEqual(["e_aggregated"]);
  });

  it("occurred_at'i olmayan (göç edilmemiş) eski kaydı silmez", async () => {
    const legacy = { id: "e_legacy", occurred_at: "" };
    const pb = fakePb({ aggregatedDays: [dayOf(daysAgo(120))], events: [legacy] });

    expect(await pruneEvents(pb as never, business, 30)).toBe(0);
    expect(pb.deleted).toEqual([]);
  });

  it("plan retention süreleri plan kaydından okunur, yoksa 30 gün", () => {
    expect(retentionDaysFor({ limits: { analytics_retention_days: 365 } } as PlanRecord)).toBe(365);
    expect(retentionDaysFor(null)).toBe(30);
  });
});
