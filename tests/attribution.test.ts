import { describe, expect, it } from "vitest";
import { deviceFromUserAgent, hostOf, normalizeSource, sourceFromReferrerHost } from "@/lib/analytics/attribution";

describe("trafik kaynağı atfı", () => {
  it("QR parametresi her şeyin önüne geçer", () => {
    expect(
      normalizeSource({ qrCode: "masa-01", utmSource: "instagram", referrer: "https://instagram.com/x" })
    ).toBe("qr");
    expect(normalizeSource({ srcParam: "qr" })).toBe("qr");
  });

  it("tanınan utm_source değerlerini olduğu gibi kullanır", () => {
    expect(normalizeSource({ utmSource: "instagram" })).toBe("instagram");
    expect(normalizeSource({ utmSource: "GOOGLE" })).toBe("google");
  });

  it("tanınmayan utm_source'u kampanya olarak toplar", () => {
    expect(normalizeSource({ utmSource: "yaz-menu-afisi" })).toBe("campaign");
  });

  it("referrer host'undan kaynağı çıkarır", () => {
    expect(normalizeSource({ referrer: "https://l.instagram.com/?u=x" })).toBe("instagram");
    expect(normalizeSource({ referrer: "https://www.google.com.tr/search?q=kafe" })).toBe("google");
    expect(normalizeSource({ referrer: "https://m.facebook.com/" })).toBe("facebook");
  });

  it("kendi host'undan gelen trafiği doğrudan sayar", () => {
    expect(normalizeSource({ referrer: "https://vezirhan.menuvaapp.com/menu", selfHost: "vezirhan.menuvaapp.com" })).toBe(
      "direct"
    );
  });

  it("referrer yoksa doğrudan, tanınmayan host'ta diğer", () => {
    expect(normalizeSource({})).toBe("direct");
    expect(normalizeSource({ referrer: "https://bilinmeyen-site.com/x" })).toBe("other");
  });

  it("tam referrer URL'i değil yalnızca host tutulur", () => {
    expect(hostOf("https://www.google.com/search?q=gizli+arama")).toBe("google.com");
    expect(sourceFromReferrerHost("www.instagram.com")).toBe("instagram");
  });
});

describe("cihaz tespiti", () => {
  it("iPhone mobil, iPad tablet, masaüstü tarayıcı desktop", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148")).toBe(
      "mobile"
    );
    expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15")).toBe("tablet");
    expect(deviceFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0")).toBe("desktop");
  });

  it("Android'de Mobile ibaresi yoksa tablet sayılır", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 13; SM-X200) Chrome/120.0 Safari/537.36")).toBe("tablet");
    expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 13; SM-G991B) Chrome/120.0 Mobile Safari/537.36")).toBe(
      "mobile"
    );
  });
});
