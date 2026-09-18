import { describe, expect, it } from "vitest";
import {
  buildImageQuery,
  isAllowedImageHost,
  needsImageCredit,
  pickAutoImage,
  pickBestImage,
  rankCandidates,
  resolveOpenLicense,
  scoreCandidate,
  toImageSource,
  type ImageCandidate,
  type ImageProvider,
  toStoredImage,
} from "@/lib/ai/images";

// Otomatik ürün görseli sözleşmesi. Korunan üç kural:
//
//  1) Lisansı belirsiz veya ticari kullanıma kapalı görsel asla kullanılmaz.
//  2) Künyesi BASILAMAYACAK görsel otomatik kullanılmaz — atıf gerektiren
//     lisansta fotoğrafçı ya da kaynak sayfası eksikse aday elenir.
//  3) Görsel sağlayıcının kendi adresinden gösterilir, bu yüzden ürüne
//     yalnızca bilinen sağlayıcı alan adları yazılabilir.

function candidate(overrides: Partial<ImageCandidate> = {}): ImageCandidate {
  return {
    id: "1",
    provider: "unsplash" as ImageProvider,
    url: "https://images.unsplash.com/photo-1",
    thumbUrl: "https://images.unsplash.com/photo-1?w=200",
    sourceUrl: "https://unsplash.com/photos/1",
    authorName: "Foto Grafcı",
    authorUrl: "https://unsplash.com/@fotografci",
    license: { code: "unsplash", name: "Unsplash Lisansı", url: "https://unsplash.com/license", attributionRequired: false },
    title: "",
    tags: [],
    width: 1200,
    height: 1200,
    ...overrides,
  };
}

describe("resolveOpenLicense", () => {
  it("ticari kullanıma açık lisansları tanır", () => {
    expect(resolveOpenLicense("cc0")?.code).toBe("cc0");
    expect(resolveOpenLicense("CC0 1.0 Universal")?.attributionRequired).toBe(false);
    expect(resolveOpenLicense("public domain")?.code).toBe("pdm");
    expect(resolveOpenLicense("by", "4.0")?.code).toBe("cc-by-4.0");
    expect(resolveOpenLicense("CC BY-SA 3.0")?.code).toBe("cc-by-sa-3.0");
  });

  it("CC BY ailesinde atıf zorunluluğunu işaretler", () => {
    expect(resolveOpenLicense("CC BY 4.0")?.attributionRequired).toBe(true);
    expect(resolveOpenLicense("CC BY-SA 4.0")?.attributionRequired).toBe(true);
  });

  it("ticari kullanıma kapalı ve türev yasağı olan lisansları reddeder", () => {
    expect(resolveOpenLicense("by-nc")).toBeNull();
    expect(resolveOpenLicense("CC BY-NC-SA 4.0")).toBeNull();
    expect(resolveOpenLicense("by-nd", "4.0")).toBeNull();
    expect(resolveOpenLicense("CC BY-NC-ND 4.0")).toBeNull();
    expect(resolveOpenLicense("sampling+")).toBeNull();
  });

  it("belirsiz ya da boş lisansı reddeder — tahmin edilmez", () => {
    expect(resolveOpenLicense("")).toBeNull();
    expect(resolveOpenLicense("   ")).toBeNull();
    expect(resolveOpenLicense("unknown")).toBeNull();
    expect(resolveOpenLicense("all rights reserved")).toBeNull();
    expect(resolveOpenLicense("fair use")).toBeNull();
  });
});

describe("isAllowedImageHost", () => {
  it("bilinen sağlayıcı alan adlarını kabul eder", () => {
    expect(isAllowedImageHost("https://images.unsplash.com/photo-1")).toBe(true);
    expect(isAllowedImageHost("https://images.pexels.com/photos/1/x.jpg")).toBe(true);
    expect(isAllowedImageHost("https://cdn.pixabay.com/photo/1.jpg")).toBe(true);
    expect(isAllowedImageHost("https://upload.wikimedia.org/x.jpg")).toBe(true);
    expect(isAllowedImageHost("https://thumb.wikimedia.org/x/1280px-x.jpg")).toBe(true);
    expect(isAllowedImageHost("https://api.openverse.org/v1/images/abc/thumb/")).toBe(true);
  });

  it("allowlist dışındaki adresleri ve https olmayanları reddeder", () => {
    expect(isAllowedImageHost("https://example.com/x.jpg")).toBe(false);
    expect(isAllowedImageHost("http://images.unsplash.com/photo-1")).toBe(false);
    expect(isAllowedImageHost("https://images.unsplash.com.evil.tr/x.jpg")).toBe(false);
    // İç ağ ve dosya erişimi kapalı (SSRF sınırı).
    expect(isAllowedImageHost("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedImageHost("file:///etc/passwd")).toBe(false);
    expect(isAllowedImageHost("bozuk-adres")).toBe(false);
  });
});

describe("buildImageQuery", () => {
  it("ölçü, fiyat ve sayı gürültüsünü temizler", () => {
    expect(buildImageQuery("Ayran 330 ml")).toBe("Ayran food");
    expect(buildImageQuery("Adana Kebap (acılı)")).toBe("Adana Kebap food");
  });

  it("ürün adı boşsa kategoriye düşer, o da boşsa arama yapılmaz", () => {
    expect(buildImageQuery("   ", "Tatlılar")).toBe("Tatlılar food");
    expect(buildImageQuery("", "")).toBe("");
  });
});

describe("scoreCandidate / pickBestImage", () => {
  it("alakalı başlık ve etiketi olan adayı öne alır", () => {
    const relevant = candidate({ id: "relevant", title: "Adana kebap tabağı", tags: ["kebap"] });
    const unrelated = candidate({ id: "unrelated", title: "Deniz manzarası", tags: ["deniz"] });

    expect(scoreCandidate(relevant, "Adana Kebap food")).toBeGreaterThan(
      scoreCandidate(unrelated, "Adana Kebap food")
    );
    expect(pickBestImage([unrelated, relevant], "Adana Kebap food")?.id).toBe("relevant");
  });

  it("eşit alakada daha yüksek çözünürlüklü görseli seçer", () => {
    const small = candidate({ id: "small", width: 400, height: 400 });
    const large = candidate({ id: "large", width: 1600, height: 1600 });
    expect(pickBestImage([small, large], "kebap food")?.id).toBe("large");
  });

  it("kareye yakın görseli panoramik olana tercih eder — menüde kare kırpılır", () => {
    const square = candidate({ id: "square", width: 1200, height: 1200 });
    const pano = candidate({ id: "pano", width: 3000, height: 1000 });
    expect(pickBestImage([pano, square], "kebap food")?.id).toBe("square");
  });

  it("aday yoksa null döner — görsel alanı boş bırakılır", () => {
    expect(pickBestImage([], "kebap food")).toBeNull();
  });

  it("sıralama özgün diziyi değiştirmez", () => {
    const list = [candidate({ id: "a", width: 400, height: 400 }), candidate({ id: "b", width: 1600, height: 1600 })];
    rankCandidates(list, "kebap food");
    expect(list.map((c) => c.id)).toEqual(["a", "b"]);
  });
});

const CC_BY = {
  code: "cc-by-4.0",
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  attributionRequired: true,
};
const CC_BY_SA = {
  code: "cc-by-sa-4.0",
  name: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
  attributionRequired: true,
};
const CC_ZERO = {
  code: "cc0",
  name: "CC0 (Kamu malı)",
  url: "https://creativecommons.org/publicdomain/zero/1.0/",
  attributionRequired: false,
};

describe("pickAutoImage", () => {
  it("künyesi eksiksiz basılabilen atıflı görseli otomatik kullanır", () => {
    const creditable = candidate({
      id: "by",
      provider: "wikimedia",
      license: CC_BY_SA,
      authorName: "Bir Fotoğrafçı",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Kebap.jpg",
    });
    expect(pickAutoImage([creditable], "Adana Kebap food")?.id).toBe("by");
  });

  it("fotoğrafçısı bilinmeyen atıflı görseli otomatik kullanmaz", () => {
    const noAuthor = candidate({ id: "by", license: CC_BY_SA, authorName: "", sourceUrl: "https://x.org/a" });
    expect(pickAutoImage([noAuthor], "kebap food")).toBeNull();
    // Seçicide yine listelenir; künyesi olmadan otomatik yazılmaz.
    expect(pickBestImage([noAuthor], "kebap food")?.id).toBe("by");
  });

  it("kaynak sayfası olmayan atıflı görseli otomatik kullanmaz", () => {
    const noSource = candidate({ id: "by", license: CC_BY_SA, authorName: "Biri", sourceUrl: "" });
    expect(pickAutoImage([noSource], "kebap food")).toBeNull();
  });

  it("künye gerektirmeyen görselde fotoğrafçı bilgisi aranmaz", () => {
    const free = candidate({ id: "free", license: CC_ZERO, authorName: "", sourceUrl: "" });
    expect(pickAutoImage([free], "kebap food")?.id).toBe("free");
  });

  it("eşit alakada yükümlülük getirmeyeni tercih eder", () => {
    const creditable = candidate({
      id: "by",
      license: CC_BY_SA,
      authorName: "Biri",
      sourceUrl: "https://x.org/a",
    });
    const free = candidate({ id: "free", license: CC_ZERO });
    expect(pickAutoImage([creditable, free], "kebap food")?.id).toBe("free");
  });
});

describe("lisans tercihi", () => {
  it("eşit alakada künye gerektirmeyeni, sonra CC BY'yi, en sona CC BY-SA'yı koyar", () => {
    const free = candidate({ id: "free", license: CC_ZERO });
    const by = candidate({ id: "by", license: CC_BY });
    const bySa = candidate({ id: "by-sa", license: CC_BY_SA });
    expect(rankCandidates([bySa, by, free], "kebap food").map((c) => c.id)).toEqual(["free", "by", "by-sa"]);
  });
});

describe("needsImageCredit", () => {
  it("yalnızca atıf zorunlu lisansta künye ister", () => {
    expect(needsImageCredit({ attribution_required: true } as never)).toBe(true);
    expect(needsImageCredit({ attribution_required: false } as never)).toBe(false);
    // Kullanıcının kendi yüklediği görselde künye yoktur.
    expect(needsImageCredit(null)).toBe(false);
    expect(needsImageCredit(undefined)).toBe(false);
  });
});

describe("toStoredImage", () => {
  it("ürüne sağlayıcının kendi adresini yazar ve künyeyi ekler", () => {
    const stored = toStoredImage(candidate({ url: "https://images.unsplash.com/photo-9" }));
    expect(stored?.url).toBe("https://images.unsplash.com/photo-9");
    expect(stored?.source.original_url).toBe("https://images.unsplash.com/photo-9");
  });

  it("tanınmayan alan adındaki görseli reddeder", () => {
    expect(toStoredImage(candidate({ url: "https://example.com/x.jpg" }))).toBeNull();
  });

  it("lisans kodu olmayan adayı reddeder — künyesiz görsel kaydedilmez", () => {
    const noLicense = candidate();
    noLicense.license = { ...noLicense.license, code: "" };
    expect(toStoredImage(noLicense)).toBeNull();
  });
});

describe("toImageSource", () => {
  it("kaynak, platform ve lisans bilgisini ürün künyesine taşır", () => {
    const source = toImageSource(
      candidate({
        provider: "wikimedia",
        url: "https://upload.wikimedia.org/kebap.jpg",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Kebap.jpg",
        authorName: "Bir Fotoğrafçı",
        license: {
          code: "cc-by-sa-4.0",
          name: "CC BY-SA 4.0",
          url: "https://creativecommons.org/licenses/by-sa/4.0/",
          attributionRequired: true,
        },
      })
    );

    expect(source.provider).toBe("wikimedia");
    expect(source.original_url).toBe("https://upload.wikimedia.org/kebap.jpg");
    expect(source.source_url).toBe("https://commons.wikimedia.org/wiki/File:Kebap.jpg");
    expect(source.license).toBe("cc-by-sa-4.0");
    expect(source.license_url).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(source.attribution_required).toBe(true);
    expect(source.author_name).toBe("Bir Fotoğrafçı");
    expect(Number.isNaN(Date.parse(source.fetched_at))).toBe(false);
  });
});
