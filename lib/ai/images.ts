// Ürün görseli arama — yalnızca ticari kullanıma açık, lisansı AÇIKÇA
// belirtilmiş kaynaklardan.
//
// Üç kural bu modülün tamamını belirler:
//
//  1) LİSANS BELİRSİZSE ADAY ELENİR. Sağlayıcı lisans alanını boş, "unknown"
//     ya da NC/ND türevi döndürüyorsa aday listeye hiç girmez. Telif riskini
//     sonradan temizlemek, görselsiz ürün yayınlamaktan çok daha pahalıdır.
//  2) GÖRSEL SAĞLAYICIDAN SERVİS EDİLİR. Ürüne sağlayıcının kendi CDN adresi
//     yazılır, dosya kopyalanmaz; bu yüzden yalnızca BİLİNEN sağlayıcı alan
//     adları kabul edilir (bkz. isAllowedImageHost) ve kaynak/lisans künyesi
//     ürünle birlikte saklanır.
//  3) ATIF YÜKÜMLÜLÜĞÜ İŞLETMEYE BIRAKILMAZ, SİSTEM YERİNE GETİRİR. CC BY /
//     BY-SA görseller otomatik de kullanılabilir çünkü künye menüde, ürün
//     detayında ve "Görsel kaynakları" sayfasında kendiliğinden basılır
//     (bkz. components/menu/image-credit.tsx). Buna karşılık künyesi
//     BASILAMAYACAK bir aday — fotoğrafçı adı ya da kaynak sayfası eksik —
//     otomatik akışa hiç girmez (bkz. canAttributeProperly). Sıralama yine de
//     yükümlülük getirmeyen lisansı öne alır.
//  4) AKIŞ ASLA BLOKLANMAZ. Anahtar yoksa, sağlayıcı düşerse ya da sonuç
//     boşsa boş liste döner; kullanıcı ürünü görselsiz kaydedip kendi
//     görselini yükleyebilir.
//
// Wikimedia Commons ve Openverse anahtar gerektirmez; bu yüzden hiçbir
// anahtar tanımlanmamış kurulumlarda bile otomatik görsel çalışır.

import type { ImageCandidate, ImageLicense, ImageProvider } from "@/lib/ai/image-source";

// Tipler ve künye dönüşümü saf modülde; buradan yeniden dışa verilir ki
// çağıranlar tek kapıdan (lib/ai/images) okumaya devam edebilsin.
export {
  isAllowedImageHost,
  needsImageCredit,
  toImageSource,
  toStoredImage,
  IMAGE_PROVIDERS,
  PROVIDER_LABELS,
} from "@/lib/ai/image-source";
export type {
  ImageCandidate,
  ImageLicense,
  ImageProvider,
  ProductImageSource,
  StoredProductImage,
} from "@/lib/ai/image-source";

const SEARCH_TIMEOUT_MS = 6000;
const USER_AGENT = "buyur-menu/1.0 (https://buyur.in; destek@buyur.in)";
/** Openverse görselleri yalnızca kendi proxy'si üzerinden servis eder; özgün
 *  dosya rastgele bir alan adında olabilir, oraya bağlanmayız. Uzun kenar
 *  sınırı budur. */
const OPENVERSE_THUMB_MAX_PX = 600;

// ─── Lisans çözümleme ────────────────────────────────────────────────

/** Sağlayıcıya özel, sabit ve ticari kullanıma açık lisanslar. */
const PROVIDER_LICENSES: Partial<Record<ImageProvider, ImageLicense>> = {
  unsplash: {
    code: "unsplash",
    name: "Unsplash Lisansı",
    url: "https://unsplash.com/license",
    attributionRequired: false,
  },
  pexels: {
    code: "pexels",
    name: "Pexels Lisansı",
    url: "https://www.pexels.com/license/",
    attributionRequired: false,
  },
  pixabay: {
    code: "pixabay",
    name: "Pixabay İçerik Lisansı",
    url: "https://pixabay.com/service/license-summary/",
    attributionRequired: false,
  },
};

const CC0: ImageLicense = {
  code: "cc0",
  name: "CC0 (Kamu malı)",
  url: "https://creativecommons.org/publicdomain/zero/1.0/",
  attributionRequired: false,
};

const PUBLIC_DOMAIN: ImageLicense = {
  code: "pdm",
  name: "Kamu malı",
  url: "https://creativecommons.org/publicdomain/mark/1.0/",
  attributionRequired: false,
};

/** Serbest metinden ticari kullanıma açık bir CC lisansı çıkarır.
 *  Tanıyamadığı ya da ticari kullanıma kapalı her değer için `null` döner —
 *  "emin değilsek kullanma" kuralı burada uygulanır. */
export function resolveOpenLicense(raw: string, version = ""): ImageLicense | null {
  const value = `${raw} ${version}`.toLowerCase().replace(/[_\s]+/g, "-");
  if (value.trim() === "" || value.includes("unknown") || value.includes("fair-use")) return null;

  // NC (ticari kullanım yasak) ve ND (türev yasak, kırpma dahil) önce elenir;
  // aksi hâlde "by-nc" içindeki "by" yanlışlıkla eşleşir.
  if (/\bnc\b|-nc-|-nc$|noncommercial/.test(value)) return null;
  if (/\bnd\b|-nd-|-nd$|noderiv/.test(value)) return null;
  if (value.includes("sampling")) return null;

  if (value.includes("cc0") || value.includes("zero")) return CC0;
  if (value.includes("public-domain") || value.includes("publicdomain") || value.includes("pdm")) {
    return PUBLIC_DOMAIN;
  }

  const ccVersion = value.match(/(\d\.\d)/)?.[1] ?? "4.0";
  if (/(^|-)by-sa(-|$)|cc-by-sa/.test(value)) {
    return {
      code: `cc-by-sa-${ccVersion}`,
      name: `CC BY-SA ${ccVersion}`,
      url: `https://creativecommons.org/licenses/by-sa/${ccVersion}/`,
      attributionRequired: true,
    };
  }
  if (/(^|-)by(-|$)|cc-by/.test(value)) {
    return {
      code: `cc-by-${ccVersion}`,
      name: `CC BY ${ccVersion}`,
      url: `https://creativecommons.org/licenses/by/${ccVersion}/`,
      attributionRequired: true,
    };
  }

  return null;
}

// ─── Sorgu kurma ─────────────────────────────────────────────────────

/** Ürün adını arama sorgusuna çevirir: fiyat/porsiyon/ölçü gürültüsü atılır,
 *  İngilizce "food" ipucu eklenerek alakasız sonuçlar azaltılır. */
export function buildImageQuery(productName: string, categoryName = ""): string {
  const cleaned = productName
    .replace(/\(.*?\)/g, " ")
    .replace(/\b\d+([.,]\d+)?\s*(gr|g|kg|ml|cl|lt|l|adet|porsiyon|kişilik|cm)\b/gi, " ")
    .replace(/[₺$€£]/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const base = cleaned !== "" ? cleaned : categoryName.trim();
  return base === "" ? "" : `${base} food`.slice(0, 100);
}

/** Yapılandırılmış sağlayıcılar. Wikimedia ve Openverse anahtar istemez, bu
 *  yüzden liste hiçbir zaman boş kalmaz. */
export function configuredProviders(): ImageProvider[] {
  const providers: ImageProvider[] = [];
  if (process.env.UNSPLASH_ACCESS_KEY) providers.push("unsplash");
  if (process.env.PEXELS_API_KEY) providers.push("pexels");
  if (process.env.PIXABAY_API_KEY) providers.push("pixabay");
  providers.push("wikimedia", "openverse");
  return providers;
}

// ─── Sağlayıcı aramaları ─────────────────────────────────────────────

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function int(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

async function searchUnsplash(query: string, limit: number): Promise<ImageCandidate[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=squarish&content_filter=high`;
  const data = (await fetchJson(url, {
    Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
  })) as { results?: unknown[] } | null;

  if (!data?.results) return [];
  return data.results.flatMap((raw) => {
    const item = raw as Record<string, any>;
    const full = str(item?.urls?.regular);
    if (full === "") return [];
    return [
      {
        id: str(item.id) || full,
        provider: "unsplash" as const,
        url: full,
        thumbUrl: str(item?.urls?.small) || full,
        sourceUrl: str(item?.links?.html),
        authorName: str(item?.user?.name),
        authorUrl: str(item?.user?.links?.html),
        license: PROVIDER_LICENSES.unsplash as ImageLicense,
        title: str(item.description) || str(item.alt_description),
        tags: Array.isArray(item.tags) ? item.tags.map((t: any) => str(t?.title)).filter(Boolean) : [],
        width: int(item.width),
        height: int(item.height),
      },
    ];
  });
}

async function searchPexels(query: string, limit: number): Promise<ImageCandidate[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=square`;
  const data = (await fetchJson(url, { Authorization: process.env.PEXELS_API_KEY as string })) as
    | { photos?: unknown[] }
    | null;

  if (!data?.photos) return [];
  return data.photos.flatMap((raw) => {
    const item = raw as Record<string, any>;
    const full = str(item?.src?.large);
    if (full === "") return [];
    return [
      {
        id: String(item.id ?? full),
        provider: "pexels" as const,
        url: full,
        thumbUrl: str(item?.src?.medium) || full,
        sourceUrl: str(item.url),
        authorName: str(item.photographer),
        authorUrl: str(item.photographer_url),
        license: PROVIDER_LICENSES.pexels as ImageLicense,
        title: str(item.alt),
        tags: [],
        width: int(item.width),
        height: int(item.height),
      },
    ];
  });
}

async function searchPixabay(query: string, limit: number): Promise<ImageCandidate[]> {
  const url = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&category=food&safesearch=true&per_page=${Math.max(3, limit)}`;
  const data = (await fetchJson(url)) as { hits?: unknown[] } | null;

  if (!data?.hits) return [];
  return data.hits.slice(0, limit).flatMap((raw) => {
    const item = raw as Record<string, any>;
    const full = str(item.largeImageURL) || str(item.webformatURL);
    if (full === "") return [];
    return [
      {
        id: String(item.id ?? full),
        provider: "pixabay" as const,
        url: full,
        thumbUrl: str(item.previewURL) || full,
        sourceUrl: str(item.pageURL),
        authorName: str(item.user),
        authorUrl: item.user ? `https://pixabay.com/users/${item.user}/` : "",
        license: PROVIDER_LICENSES.pixabay as ImageLicense,
        title: "",
        tags: str(item.tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        width: int(item.imageWidth),
        height: int(item.imageHeight),
      },
    ];
  });
}

/** Wikimedia Commons. Lisans `extmetadata` içinden okunur; alan yoksa ya da
 *  tanınmayan bir lisanssa aday düşürülür. */
async function searchWikimedia(query: string, limit: number): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: String(limit * 2),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1024",
    iiextmetadatafilter: "LicenseShortName|License|Artist|ArtistPage|ImageDescription|UsageTerms",
  });
  const data = (await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`)) as
    | { query?: { pages?: unknown[] } }
    | null;

  const pages = data?.query?.pages;
  if (!Array.isArray(pages)) return [];

  return pages.flatMap((raw) => {
    const page = raw as Record<string, any>;
    const info = page?.imageinfo?.[0] as Record<string, any> | undefined;
    if (!info) return [];

    const meta = (info.extmetadata ?? {}) as Record<string, { value?: unknown }>;
    const license = resolveOpenLicense(
      `${str(meta.License?.value)} ${str(meta.LicenseShortName?.value)} ${str(meta.UsageTerms?.value)}`
    );
    // Lisans okunamadıysa görsel hiç gösterilmez.
    if (!license) return [];

    const full = str(info.thumburl) || str(info.url);
    if (full === "") return [];

    return [
      {
        id: String(page.pageid ?? full),
        provider: "wikimedia" as const,
        url: full,
        thumbUrl: str(info.thumburl) || full,
        sourceUrl: str(info.descriptionurl),
        // Artist alanı HTML içerebilir; etiketler temizlenir.
        authorName: str(meta.Artist?.value).replace(/<[^>]*>/g, "").trim().slice(0, 120),
        authorUrl: str(info.descriptionurl),
        license,
        title: str(page.title).replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
        tags: [],
        width: int(info.thumbwidth) || int(info.width),
        height: int(info.thumbheight) || int(info.height),
      },
    ];
  });
}

/** Openverse. `license_type=commercial` ile sorgulanır, dönen lisans yine de
 *  kendi allowlist'imizden geçirilir (sağlayıcıya körü körüne güvenilmez). */
async function searchOpenverse(query: string, limit: number, license = ""): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: String(limit),
    mature: "false",
  });
  // Lisans daraltması verilmezse ticari kullanıma açık olanların tamamı.
  if (license) params.set("license", license);
  else params.set("license_type", "commercial");
  const token = process.env.OPENVERSE_API_TOKEN;
  const data = (await fetchJson(
    `https://api.openverse.org/v1/images/?${params}`,
    token ? { Authorization: `Bearer ${token}` } : {}
  )) as { results?: unknown[] } | null;

  if (!data?.results) return [];
  return data.results.flatMap((raw) => {
    const item = raw as Record<string, any>;
    const license = resolveOpenLicense(str(item.license), str(item.license_version));
    if (!license) return [];

    const proxied = str(item.thumbnail);
    if (proxied === "") return [];

    // Menüde gösterilen, proxy'nin küçülttüğü sürümdür; puanlama özgün boyuta
    // göre yapılırsa aday olduğundan kaliteli görünür.
    const width = int(item.width);
    const height = int(item.height);
    const longest = Math.max(width, height);
    const scale = longest > OPENVERSE_THUMB_MAX_PX ? OPENVERSE_THUMB_MAX_PX / longest : 1;

    return [
      {
        id: String(item.id ?? proxied),
        provider: "openverse" as const,
        url: proxied,
        thumbUrl: proxied,
        sourceUrl: str(item.foreign_landing_url) || str(item.url),
        authorName: str(item.creator),
        authorUrl: str(item.creator_url),
        // Lisans metni adresi sağlayıcıdan gelirse tercih edilir.
        license: { ...license, url: str(item.license_url) || license.url },
        title: str(item.title),
        tags: Array.isArray(item.tags) ? item.tags.map((t: any) => str(t?.name)).filter(Boolean) : [],
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      },
    ];
  });
}

/** Openverse iki kez sorgulanır: bir kez künye gerektirmeyenlere (cc0/pdm)
 *  daraltılmış, bir kez ticari kullanıma açık olanların tamamına. Tek sorguda
 *  CC BY sonuçları CC0'ları listeden itiyor ve otomatik akış (yalnızca künye
 *  gerektirmeyeni kullanır) elinde aday kalmadan dönüyordu. */
async function searchOpenverseBoth(query: string, limit: number): Promise<ImageCandidate[]> {
  const [attributionFree, all] = await Promise.all([
    searchOpenverse(query, limit, "cc0,pdm"),
    searchOpenverse(query, limit),
  ]);

  const seen = new Set<string>();
  return [...attributionFree, ...all].filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

const SEARCHERS: Record<ImageProvider, (query: string, limit: number) => Promise<ImageCandidate[]>> = {
  unsplash: searchUnsplash,
  pexels: searchPexels,
  pixabay: searchPixabay,
  wikimedia: searchWikimedia,
  openverse: searchOpenverseBoth,
};

// ─── Seçim: alaka + kalite ───────────────────────────────────────────

const STOPWORDS = new Set(["food", "and", "the", "ile", "ve"]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

/** Eşit alakada sıralamayı belirleyen sağlayıcı katsayısı. İki şey tartılır:
 *  yemek fotoğrafı yoğunluğu ve servis hızı — görsel müşterinin tarayıcısına
 *  doğrudan sağlayıcıdan geldiği için menü açılış süresini etkiler. Openverse
 *  kendi proxy'si üzerinden servis ettiği için ölçülebilir biçimde yavaştır,
 *  bu yüzden eşitlikte en sona düşer (tek aday olduğunda yine kullanılır). */
const PROVIDER_BONUS: Record<ImageProvider, number> = {
  unsplash: 8,
  pexels: 8,
  pixabay: 6,
  wikimedia: 3,
  openverse: 1,
};

/** Adayı 0-100 aralığında puanlar: alaka (başlık/etiket eşleşmesi), görsel
 *  kalite (çözünürlük + kareye yakınlık) ve sağlayıcı güveni. */
export function scoreCandidate(candidate: ImageCandidate, query: string): number {
  const queryTokens = tokenize(query);
  const haystack = tokenize(`${candidate.title} ${candidate.tags.join(" ")}`);

  const matched = queryTokens.filter((token) =>
    haystack.some((word) => word === token || word.startsWith(token) || token.startsWith(word))
  );
  const relevance = queryTokens.length === 0 ? 0 : matched.length / queryTokens.length;
  let score = relevance * 60;

  // Çözünürlük: menü kartında net görünmesi için kısa kenar belirleyici.
  const shortSide = Math.min(candidate.width || 0, candidate.height || 0);
  if (shortSide === 0) score += 8; // bilinmiyor → nötr, cezalandırma yok
  else if (shortSide >= 1200) score += 20;
  else if (shortSide >= 800) score += 16;
  else if (shortSide >= 500) score += 10;
  else score += 2;

  // Menüde kare kırpılıyor; panoramik görsellerde kayıp fazla.
  if (candidate.width > 0 && candidate.height > 0) {
    const ratio = Math.max(candidate.width, candidate.height) / Math.min(candidate.width, candidate.height);
    if (ratio <= 1.35) score += 12;
    else if (ratio <= 1.8) score += 6;
  }

  score += PROVIDER_BONUS[candidate.provider] ?? 0;
  score += licenseBonus(candidate.license);

  return score;
}

/** Lisansın işletmeye yüklediği yükümlülük sıralamaya girer:
 *  künye gerektirmeyen > CC BY > CC BY-SA. BY-SA en sonda çünkü ShareAlike
 *  kuyruğu ticari bir üründe en riskli olanı. */
function licenseBonus(license: ImageLicense): number {
  if (!license.attributionRequired) return 18;
  return license.code.startsWith("cc-by-sa") ? 0 : 6;
}

/** Künyesi eksiksiz basılabilen aday mı.
 *
 *  Lisans şartı gerektiren bir durumda fotoğrafçı adı ya da kaynak sayfası yoksa
 *  geçerli bir künye üretemeyiz — böyle bir görseli otomatik kullanmak,
 *  yerine getiremeyeceğimiz bir yükümlülüğü sessizce kabul etmek olur. */
export function canAttributeProperly(candidate: ImageCandidate): boolean {
  if (!candidate.license.attributionRequired) return true;
  return candidate.authorName.trim() !== "" && candidate.sourceUrl.trim() !== "";
}

/** OTOMATİK akışın seçimi: künyesi eksiksiz basılabilen adaylar arasından.
 *  Uygun aday yoksa null döner ve görsel alanı boş kalır. */
export function pickAutoImage(candidates: ImageCandidate[], query: string): ImageCandidate | null {
  return pickBestImage(candidates.filter(canAttributeProperly), query);
}

/** Adaylar arasından en uygununu seçer. Liste boşsa null. */
export function pickBestImage(candidates: ImageCandidate[], query: string): ImageCandidate | null {
  if (candidates.length === 0) return null;
  return rankCandidates(candidates, query)[0];
}

/** Puana göre sıralı kopya döner (özgün dizi değişmez). */
export function rankCandidates(candidates: ImageCandidate[], query: string): ImageCandidate[] {
  return [...candidates].sort((a, b) => scoreCandidate(b, query) - scoreCandidate(a, query));
}

/** Ürün adına uygun görsel adayları — tüm sağlayıcılar paralel sorgulanır ve
 *  sonuçlar tek havuzda puanlanır. Hiçbir koşulda hata fırlatmaz. */
export async function searchProductImages(
  productName: string,
  categoryName = "",
  limit = 8
): Promise<ImageCandidate[]> {
  const query = buildImageQuery(productName, categoryName);
  if (query === "") return [];

  const providers = configuredProviders();
  // Paralel: gecikmenin kaynağı ağ turu, sıralı denemek boşuna beklemek olur.
  const settled = await Promise.allSettled(
    providers.map((provider) => SEARCHERS[provider](query, Math.max(3, Math.ceil(limit / 2))))
  );

  const pool: ImageCandidate[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") pool.push(...result.value);
    // Bir sağlayıcı düşerse diğerleriyle devam; ürün oluşturma engellenmemeli.
    else console.error(`Görsel arama hatası (${providers[index]}):`, result.reason);
  });

  return rankCandidates(pool, query).slice(0, limit);
}
