// Görsel kaynak/lisans künyesi — saf veri katmanı.
//
// Ayrı dosya olmasının nedeni: panel istemcisi bu tipleri ve dönüşümü
// kullanır, sağlayıcı arama kodunu (lib/ai/images.ts) kullanmaz. Saf modül
// ayrı durunca arama mantığı istemci paketine sürüklenmez.

export type ImageProvider = "unsplash" | "pexels" | "pixabay" | "wikimedia" | "openverse";

export interface ImageLicense {
  /** Kısa kod — üründe saklanan makine okunur değer. */
  code: string;
  /** Kullanıcıya gösterilen ad. */
  name: string;
  /** Lisans metninin adresi. */
  url: string;
  /** Kaynak gösterimi lisans gereği zorunlu mu (CC BY ailesi). */
  attributionRequired: boolean;
}

export interface ImageCandidate {
  id: string;
  provider: ImageProvider;
  /** Menüde gösterilecek tam boy adres (sağlayıcının kendi CDN'i). */
  url: string;
  /** Önizleme için küçük boy. */
  thumbUrl: string;
  /** Görselin kaynak sayfası — atıf ve denetim için saklanır. */
  sourceUrl: string;
  authorName: string;
  authorUrl: string;
  license: ImageLicense;
  title: string;
  tags: string[];
  width: number;
  height: number;
}

/** Ürün kaydıyla birlikte saklanan kaynak/lisans künyesi. */
export interface ProductImageSource {
  provider: ImageProvider;
  /** Ürüne yazılan adresin ta kendisi — görsel sağlayıcıdan servis edilir. */
  original_url: string;
  source_url: string;
  license: string;
  license_name: string;
  license_url: string;
  attribution_required: boolean;
  author_name: string;
  author_url: string;
  fetched_at: string;
}

export const IMAGE_PROVIDERS: ImageProvider[] = [
  "unsplash",
  "pexels",
  "pixabay",
  "wikimedia",
  "openverse",
];

export const PROVIDER_LABELS: Record<ImageProvider, string> = {
  unsplash: "Unsplash",
  pexels: "Pexels",
  pixabay: "Pixabay",
  wikimedia: "Wikimedia Commons",
  openverse: "Openverse",
};

/** Ürüne yazılmasına izin verilen alan adları. Menüdeki görsel doğrudan
 *  sağlayıcıdan servis edildiği için, kaydedilen adres bilinen bir sağlayıcıya
 *  ait olmalı — aksi hâlde ürün kaydı rastgele bir adrese açılmış kapı olur. */
const ALLOWED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "upload.wikimedia.org",
  // Commons küçültülmüş sürümleri ayrı alan adından servis eder.
  "thumb.wikimedia.org",
  "commons.wikimedia.org",
  "api.openverse.org",
];

export function isAllowedImageHost(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_IMAGE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export interface StoredProductImage {
  /** Ürüne yazılacak adres — sağlayıcının kendi CDN'i. */
  url: string;
  source: ProductImageSource;
}

/** Görselin menüde künye gösterilmesini gerektirip gerektirmediği. Künye
 *  yoksa (kullanıcının kendi yüklediği görsel) yükümlülük de yoktur. */
export function needsImageCredit(
  source: ProductImageSource | null | undefined
): source is ProductImageSource {
  return source?.attribution_required === true;
}

/** Adayı ürüne yazılacak hâle getirir. Adres bilinen bir sağlayıcıya ait
 *  değilse ya da lisans kodu yoksa null döner — künyesiz ya da tanınmayan
 *  adresli görsel kaydedilmez. */
export function toStoredImage(candidate: ImageCandidate): StoredProductImage | null {
  if (!isAllowedImageHost(candidate.url)) return null;
  if (!candidate.license?.code) return null;
  return { url: candidate.url, source: toImageSource(candidate) };
}

/** Adaydan ürün kaydında saklanacak künyeyi üretir. */
export function toImageSource(candidate: ImageCandidate): ProductImageSource {
  return {
    provider: candidate.provider,
    original_url: candidate.url,
    source_url: candidate.sourceUrl,
    license: candidate.license.code,
    license_name: candidate.license.name,
    license_url: candidate.license.url,
    attribution_required: candidate.license.attributionRequired,
    author_name: candidate.authorName,
    author_url: candidate.authorUrl,
    fetched_at: new Date().toISOString(),
  };
}
