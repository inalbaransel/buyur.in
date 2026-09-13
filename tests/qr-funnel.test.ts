import { describe, expect, it } from "vitest";
import { buildDailyRows } from "@/lib/analytics/rollup";
import type { MenuEvent } from "@/lib/types";

// QR bazında huni: tarama → menü açılışı → ürün görüntüleme → sepete ekleme.
// Adımlar tekil oturum sayısıdır; aynı oturumun tekrar eden event'leri bir kez sayılır.

const TZ = "Europe/Istanbul";

function event(type: MenuEvent["type"], session: string, overrides: Partial<MenuEvent> = {}): MenuEvent {
  return {
    id: `e${Math.random().toString(36).slice(2, 8)}`,
    business: "biz",
    type,
    target: "",
    label: "",
    session,
    visitor: `v-${session}`,
    qr: "qrmasa000000004",
    source: "qr",
    medium: "",
    campaign: "",
    referrer_host: "",
    device: "mobile",
    country: "TR",
    city: "",
    locale: "tr",
    occurred_at: "2026-09-10T18:00:00.000Z",
    created: "2026-09-10T18:00:00.000Z",
    updated: "2026-09-10T18:00:00.000Z",
    ...overrides,
  };
}

describe("QR hunisi", () => {
  it("her adımı QR başına tekil oturum olarak sayar", () => {
    const events = [
      event("qr_scan", "s1"),
      event("page_view", "s1"),
      event("page_view", "s1"),
      event("product_view", "s1", { product: "prod00000000001" }),
      event("add_to_cart", "s1", { product: "prod00000000001" }),
      event("qr_scan", "s2"),
      event("page_view", "s2"),
      event("product_detail_view", "s2", { product: "prod00000000002" }),
      event("qr_scan", "s3"),
      event("page_view", "s3"),
    ];

    const row = buildDailyRows(events, [], TZ).find((item) => item.dimension === "qr" && item.key === "qrmasa000000004");
    expect(row?.metrics.scans).toBe(3);
    expect(row?.metrics.menu_opens).toBe(3);
    expect(row?.metrics.product_viewers).toBe(2);
    expect(row?.metrics.cart_adders).toBe(1);
  });

  it("QR'sız oturumları QR hunisine yazmaz", () => {
    const rows = buildDailyRows([event("page_view", "s9", { qr: "", source: "direct" })], [], TZ);
    expect(rows.some((row) => row.dimension === "qr")).toBe(false);
  });
});
