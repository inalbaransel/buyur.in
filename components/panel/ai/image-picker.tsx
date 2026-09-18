"use client";

import { useEffect, useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import { Button, Spinner } from "@/components/panel/ui";
import { ImageIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { searchImageCandidates } from "@/lib/ai/find-image";
import { needsImageCredit, PROVIDER_LABELS, toStoredImage } from "@/lib/ai/image-source";
import type { ImageCandidate, ProductImageSource } from "@/lib/ai/image-source";

// Ürün görseli seçici: açık lisanslı kaynaklardan arar, kullanıcı değiştirebilir,
// yeniden aratabilir veya kendi görselini yükleyebilir.
//
// Seçilen görsel sağlayıcının kendi adresiyle kaydedilir; kaynak ve lisans
// künyesi `onChange`'in ikinci parametresiyle çağırana geçer.
// Arama başarısız olursa hiçbir şey engellenmez — ürün görselsiz oluşur.

export function ImagePicker({
  businessId,
  productName,
  categoryName,
  value,
  onChange,
  onClose,
}: {
  businessId: string;
  productName: string;
  categoryName: string;
  value: string;
  onChange: (url: string, source: ProductImageSource | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(productName);
  const [images, setImages] = useState<ImageCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [searched, setSearched] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    search(productName);
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(term: string) {
    setLoading(true);
    setFailed(false);
    const result = await searchImageCandidates(businessId, term, categoryName);
    if (!alive.current) return;
    setImages(result.images);
    setConfigured(result.configured);
    setLoading(false);
    setSearched(true);
  }

  /** Seçilen adayın adresi ve künyesi ürüne yazılır. Adres bilinen bir
   *  sağlayıcıya ait değilse seçim uygulanmaz. */
  function handlePick(candidate: ImageCandidate) {
    const stored = toStoredImage(candidate);
    if (!stored) {
      setFailed(true);
      return;
    }
    onChange(stored.url, stored.source);
    onClose();
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file, businessId, "product", productName);
      // Kendi görselinde dış kaynak künyesi olmaz.
      onChange(url, null);
      onClose();
    } catch {
      // Yükleme hatası akışı durdurmaz; kullanıcı görselsiz devam edebilir.
      setFailed(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-crema/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search(query);
            }
          }}
          placeholder="Görsel ara"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-paprika"
        />
        <Button type="button" variant="outline" onClick={() => search(query)} disabled={loading}>
          <SearchIcon size={15} /> Ara
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Kapat
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-soft">
          <Spinner className="h-4 w-4" /> Görseller aranıyor…
        </div>
      )}

      {!loading && !configured && (
        <p className="py-3 text-sm text-ink-soft">
          Otomatik görsel arama yapılandırılmamış. Kendi görselinizi yükleyebilirsiniz.
        </p>
      )}

      {!loading && configured && searched && images.length === 0 && (
        <p className="py-3 text-sm text-ink-soft">
          Bu ürün için ticari kullanıma açık görsel bulunamadı. Aramayı değiştirin veya kendi görselinizi
          yükleyin.
        </p>
      )}

      {!loading && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image) => (
            <button
              key={`${image.provider}-${image.id}`}
              type="button"
              onClick={() => handlePick(image)}
              title={`${PROVIDER_LABELS[image.provider]}${image.authorName ? ` · ${image.authorName}` : ""} · ${image.license.name}`}
              className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                value === image.url ? "border-paprika" : "border-line hover:border-paprika"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              {image.license.attributionRequired && (
                <span className="absolute left-1 top-1 rounded bg-ink/75 px-1.5 py-0.5 text-[9px] font-semibold text-paper">
                  Atıf gerekli
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-ink/60 px-1 py-0.5 text-[9px] text-paper">
                {image.authorName ? `${image.authorName} · ` : ""}
                {image.license.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {failed && (
        <p className="mt-3 text-sm text-paprika-deep">
          Görsel eklenemedi. Başka bir görsel seçin veya kendi görselinizi yükleyin.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        Yalnızca ticari kullanıma açık, lisansı belirtilmiş görseller listelenir.{" "}
        <strong className="font-semibold">Atıf gerekli</strong> işaretli görsellerde fotoğrafçı ve lisans
        bilgisi menünüzde otomatik gösterilir; sizin yapmanız gereken bir şey yok.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-[12px] uppercase tracking-wider transition-colors hover:border-paprika hover:text-paprika">
          <ImageIcon size={15} />
          {uploading ? "Yükleniyor…" : "Kendi görselim"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("", null);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-paprika"
          >
            <TrashIcon size={15} /> Görseli kaldır
          </button>
        )}
      </div>
    </div>
  );
}

/** Otomatik bulunan görselin kaynak/lisans künyesi. Atıf zorunlu lisanslarda
 *  (CC BY ailesi) fotoğrafçı adı ve kaynak bağlantısı gösterilir. */
export function ImageSourceNote({ source }: { source: ProductImageSource }) {
  return (
    <p className="text-[11px] leading-relaxed text-ink-soft">
      Kaynak:{" "}
      {source.source_url ? (
        <a href={source.source_url} target="_blank" rel="noreferrer noopener" className="underline">
          {PROVIDER_LABELS[source.provider] ?? source.provider}
        </a>
      ) : (
        (PROVIDER_LABELS[source.provider] ?? source.provider)
      )}
      {source.author_name && ` · ${source.author_name}`} ·{" "}
      {source.license_url ? (
        <a href={source.license_url} target="_blank" rel="noreferrer noopener" className="underline">
          {source.license_name}
        </a>
      ) : (
        source.license_name
      )}
      {source.attribution_required && (
        <>
          <br />
          Bu lisans künye ister — fotoğrafçı ve lisans bilgisi menünüzde otomatik gösterilir.
        </>
      )}
    </p>
  );
}
