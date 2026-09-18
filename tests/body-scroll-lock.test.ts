import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lockBodyScroll } from "@/lib/use-body-scroll-lock";

// Panelde "scroll edemiyorum" hatasının sözleşmesi: pencereler hangi sırada
// açılıp kapanırsa kapansın gövde en sonunda ilk hâline dönmeli.
const body = { style: { overflow: "" } };

beforeEach(() => {
  body.style.overflow = "";
  (globalThis as unknown as { document: unknown }).document = { body };
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

describe("lockBodyScroll", () => {
  it("tek pencere: açınca kilitler, kapatınca çözer", () => {
    const release = lockBodyScroll();
    expect(body.style.overflow).toBe("hidden");
    release();
    expect(body.style.overflow).toBe("");
  });

  it("iç içe iki pencere, önce ilk açılan kapansa da kilit takılı kalmaz", () => {
    const first = lockBodyScroll();
    const second = lockBodyScroll();
    first();
    expect(body.style.overflow).toBe("hidden");
    second();
    expect(body.style.overflow).toBe("");
  });

  it("iki pencere aynı anda kapanınca da (üst-alt sırası fark etmez) çözülür", () => {
    const first = lockBodyScroll();
    const second = lockBodyScroll();
    second();
    first();
    expect(body.style.overflow).toBe("");
  });

  it("yeniden render: kilidi bırakıp hemen tekrar almak kalıcı 'hidden' üretmez", () => {
    const first = lockBodyScroll();
    const second = lockBodyScroll();
    // React effect'i her render'da: önce tüm cleanup'lar, sonra tüm kurulumlar.
    first();
    second();
    const firstAgain = lockBodyScroll();
    const secondAgain = lockBodyScroll();
    firstAgain();
    secondAgain();
    expect(body.style.overflow).toBe("");
  });

  it("aynı kilidi iki kez bırakmak sayacı bozmaz", () => {
    const outer = lockBodyScroll();
    const inner = lockBodyScroll();
    inner();
    inner();
    expect(body.style.overflow).toBe("hidden");
    outer();
    expect(body.style.overflow).toBe("");
  });

  it("gövdenin daha önce sahip olduğu değer geri yazılır", () => {
    body.style.overflow = "scroll";
    const release = lockBodyScroll();
    release();
    expect(body.style.overflow).toBe("scroll");
  });
});
