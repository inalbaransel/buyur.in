import { describe, expect, it } from "vitest";
import { buildObjectPath } from "@/lib/minio";

// MinIO'daki dosya adı sözleşmesi: içerik adı + tarih damgası.
// Logo/kapak bunun dışındadır; sabit isimle üzerine yazılır.
describe("buildObjectPath", () => {
  it("logo ve kapağı sabit isimle yazar", () => {
    expect(buildObjectPath("kofteci", "logo", "image/png", "Köfteci Ali")).toBe("kofteci/logo.png");
    expect(buildObjectPath("kofteci", "cover", "image/webp")).toBe("kofteci/cover.webp");
  });

  it("ürün görselini ad ve tarihle adlandırır", () => {
    const path = buildObjectPath("kofteci", "product", "image/jpeg", "Izgara Köfte");
    expect(path).toMatch(/^kofteci\/products\/izgara-kofte-\d{8}-\d{6}\.jpg$/);
  });

  it("türkçe karakter ve boşlukları slug'a çevirir", () => {
    const path = buildObjectPath("kofteci", "category", "image/png", "Çorbalar & Şuruplu Tatlılar");
    expect(path).toMatch(/^kofteci\/categorys\/corbalar-suruplu-tatlilar-\d{8}-\d{6}\.png$/);
  });

  it("ad yoksa ya da tamamen özel karakterse yalnız tarih kalır", () => {
    expect(buildObjectPath("kofteci", "popup", "image/png")).toMatch(/^kofteci\/popups\/\d{8}-\d{6}\.png$/);
    expect(buildObjectPath("kofteci", "popup", "image/png", "***")).toMatch(/^kofteci\/popups\/\d{8}-\d{6}\.png$/);
  });

  it("bilinmeyen mime türünde .bin uzantısı kullanır", () => {
    expect(buildObjectPath("kofteci", "product", "image/tiff", "Test")).toMatch(/\.bin$/);
  });
});
