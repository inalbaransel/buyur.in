// Yüklenen menü sayfalarının parmak izi.
//
// Aynı fotoğrafı ikinci kez taramak hem kotadan hak yer hem de menüye ikinci
// bir tekrar seti üretir. Parmak izi, "bu dosyaları zaten taradınız" demeyi
// mümkün kılar — hem panelde hem /api/ai/scan tarafında aynı değer kullanılır.

/** Web Crypto yoksa (güvenli olmayan bağlamda açılan panel) kullanılan yedek
 *  özet. Amaç çarpışma saldırısına dayanmak değil, kullanıcıyı uyarmak. */
function fallbackHash(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619) >>> 0;
    h2 = Math.imul(h2 + code + i, 2246822519) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}${value.length.toString(16)}`;
}

/** Sayfa sırasından bağımsız tekil özet: aynı dosyalar farklı sırayla
 *  seçildiğinde de aynı parmak izi çıkar. */
export async function fingerprintPages(pages: string[]): Promise<string> {
  const joined = [...pages].sort().join("|");
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fallbackHash(joined);
  try {
    const buffer = await subtle.digest("SHA-256", new TextEncoder().encode(joined));
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fallbackHash(joined);
  }
}
