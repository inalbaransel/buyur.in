// Panel tarafının görsel bulma yardımcıları.
//
// Akış: ara → en uygun adayı seç → ürüne sağlayıcının adresini ve kaynak
// künyesini yaz. Görsel kopyalanmaz, sağlayıcının kendi CDN'inden servis
// edilir; künye telif denetimi için ürünle birlikte saklanır.
//
// Sağlayıcı arama kodu (lib/ai/images) buraya sızmaz — yalnızca saf künye
// modülü ve tipler kullanılır.

import { pb } from "@/lib/pocketbase";
import { toStoredImage } from "@/lib/ai/image-source";
import type { ImageCandidate, StoredProductImage } from "@/lib/ai/image-source";

export interface ImageSearchResult {
  images: ImageCandidate[];
  best: ImageCandidate | null;
  configured: boolean;
}

const EMPTY: ImageSearchResult = { images: [], best: null, configured: true };

/** Aday görselleri arar. Hata hâlinde boş sonuç döner — çağıran akış durmaz. */
export async function searchImageCandidates(
  businessId: string,
  name: string,
  category: string,
  signal?: AbortSignal,
  limit?: number
): Promise<ImageSearchResult> {
  try {
    const res = await fetch("/api/ai/images", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: pb.authStore.token },
      body: JSON.stringify({ businessId, name, category, limit }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) return EMPTY;
    return {
      images: Array.isArray(data.images) ? (data.images as ImageCandidate[]) : [],
      best: (data.best as ImageCandidate | null) ?? null,
      configured: data.configured !== false,
    };
  } catch {
    return EMPTY;
  }
}

/** Ürün adı + kategoriden görsel bulur. Uygun görsel yoksa null —
 *  kullanıcı kendi görselini yükleyebilir. */
export async function autoFindProductImage(
  businessId: string,
  name: string,
  category: string,
  signal?: AbortSignal
): Promise<StoredProductImage | null> {
  const { best } = await searchImageCandidates(businessId, name, category, signal);
  return best ? toStoredImage(best) : null;
}
