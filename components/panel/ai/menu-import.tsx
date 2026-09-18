"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { useToast } from "@/components/panel/toast";
import { AiButton, Button, Card, Spinner, Switch } from "@/components/panel/ui";
import { ImagePicker } from "@/components/panel/ai/image-picker";
import { autoFindProductImage } from "@/lib/ai/find-image";
import type { ProductImageSource } from "@/lib/ai/image-source";
import { CheckCircleIcon, ImageIcon, TrashIcon } from "@/components/icons";
import { aiUsage } from "@/lib/entitlements";
import type { ScannedCategory, ScannedProduct } from "@/lib/ai/menu-scan";
import type { Business } from "@/lib/types";

// Fiziksel menü aktarımı: yükle → tara → önizle/düzelt → onayla → aktar.
//
// İki kural arayüzü belirliyor:
//  1) Okunamayan fiyat tahmin edilmez; kullanıcı doldurana kadar içe aktarma
//     kilitli kalır (yanlış fiyat, eksik fiyattan çok daha pahalıdır).
//  2) İçerik varsayılan olarak TASLAK aktarılır; yayına almak ayrı bir karardır.

type DraftProduct = ScannedProduct & { image_url: string; image_source: ProductImageSource | null };
type DraftCategory = Omit<ScannedCategory, "products"> & { products: DraftProduct[] };

const UNCERTAIN_LABELS: Record<string, string> = {
  name: "Ad okunamadı",
  description: "Açıklama belirsiz",
  price: "Fiyat okunamadı",
  currency: "Para birimi belirsiz",
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

function UncertainBadge({ field }: { field: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-paprika/40 bg-paprika/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paprika-deep">
      {UNCERTAIN_LABELS[field] ?? field}
    </span>
  );
}

function ProductRow({
  product,
  businessId,
  categoryName,
  onChange,
  onDelete,
}: {
  product: DraftProduct;
  businessId: string;
  categoryName: string;
  onChange: (next: DraftProduct) => void;
  onDelete: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const missingPrice = product.price === null;

  return (
    <div className={`rounded-xl border p-3 ${missingPrice ? "border-paprika/40 bg-paprika/5" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          title="Görsel seç"
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-crema text-ink-soft transition-colors hover:border-paprika"
        >
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={18} />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={product.name}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
            placeholder="Ürün adı"
            className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-semibold outline-none focus:border-paprika"
          />
          <textarea
            value={product.description}
            onChange={(e) => onChange({ ...product, description: e.target.value })}
            placeholder="Açıklama (opsiyonel)"
            rows={2}
            className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-paprika"
          />
          {product.uncertain.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.uncertain.map((field) => (
                <UncertainBadge key={field} field={field} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              step="0.01"
              value={product.price ?? ""}
              placeholder="—"
              onChange={(e) => {
                const raw = e.target.value;
                const parsed = raw === "" ? null : Number(raw);
                onChange({
                  ...product,
                  price: parsed === null || Number.isNaN(parsed) ? null : parsed,
                  // Kullanıcı fiyatı girdiyse işaret kalkar.
                  uncertain: raw === "" ? product.uncertain : product.uncertain.filter((f) => f !== "price"),
                });
              }}
              className="w-24 rounded-lg border border-line bg-paper px-2 py-1.5 text-right font-mono text-sm outline-none focus:border-paprika"
            />
            <span className="font-mono text-xs text-ink-soft">₺</span>
          </div>
          <button
            type="button"
            onClick={onDelete}
            title="Ürünü çıkar"
            className="rounded p-1.5 text-ink-soft transition-colors hover:bg-crema hover:text-paprika"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </div>

      {picking && (
        <div className="mt-3">
          <ImagePicker
            businessId={businessId}
            productName={product.name}
            categoryName={categoryName}
            value={product.image_url}
            onChange={(url, source) => onChange({ ...product, image_url: url, image_source: source })}
            onClose={() => setPicking(false)}
          />
        </div>
      )}
    </div>
  );
}

export function MenuImport({ business }: { business: Business }) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<{ name: string; dataUrl: string; isPdf: boolean }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [findingImages, setFindingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [categories, setCategories] = useState<DraftCategory[] | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [currency, setCurrency] = useState("");

  // Sayfa sınırı plandan gelir — elle plan karşılaştırması yapılmaz.
  const pagesPerScan = aiUsage(business).pagesPerScan;

  const totalProducts = categories?.reduce((sum, c) => sum + c.products.length, 0) ?? 0;
  const missingPriceCount =
    categories?.reduce((sum, c) => sum + c.products.filter((p) => p.price === null).length, 0) ?? 0;
  const uncertainCount =
    categories?.reduce(
      (sum, c) => sum + c.products.reduce((inner, p) => inner + p.uncertain.length, 0),
      0
    ) ?? 0;

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    try {
      const parsed = await Promise.all(
        Array.from(selected).map(async (file) => ({
          name: file.name,
          dataUrl: await readAsDataUrl(file),
          isPdf: file.type === "application/pdf",
        }))
      );
      setFiles(parsed);
    } catch {
      toast("Dosyalar okunamadı. Tekrar deneyin.", "error");
    }
  }

  async function handleScan() {
    if (files.length === 0) return;
    setScanning(true);
    setCategories(null);

    try {
      const res = await fetch("/api/ai/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: pb.authStore.token },
        body: JSON.stringify({ businessId: business.id, images: files.map((f) => f.dataUrl) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tarama başarısız oldu.");

      setCategories(
        (data.categories as ScannedCategory[]).map((category) => ({
          ...category,
          products: category.products.map((product) => ({ ...product, image_url: "", image_source: null })),
        }))
      );
      setCurrency(typeof data.currency === "string" ? data.currency : "");
      toast("Menü tarandı. Kontrol edip düzenleyebilirsiniz.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Tarama başarısız oldu.", "error");
    } finally {
      setScanning(false);
    }
  }

  /** Görseli olmayan ürünler için sırayla arama yapar. Bir ürün için görsel
   *  bulunamazsa atlanır — akış hiçbir koşulda durmaz. */
  async function handleFindImages() {
    if (!categories) return;
    setFindingImages(true);
    setImageProgress(0);

    const pending = categories.flatMap((category) =>
      category.products.filter((p) => !p.image_url).map((product) => ({ category, product }))
    );

    let done = 0;
    const found = new Map<string, { url: string; source: ProductImageSource }>();

    for (const { category, product } of pending) {
      const stored = await autoFindProductImage(business.id, product.name, category.name);
      if (stored) found.set(product.id, stored);
      done += 1;
      setImageProgress(Math.round((done / pending.length) * 100));
    }

    setCategories((current) =>
      current?.map((category) => ({
        ...category,
        products: category.products.map((product) => {
          const stored = found.get(product.id);
          return stored ? { ...product, image_url: stored.url, image_source: stored.source } : product;
        }),
      })) ?? null
    );

    setFindingImages(false);
    toast(found.size > 0 ? `${found.size} ürüne görsel bulundu.` : "Uygun görsel bulunamadı.");
  }

  function updateProduct(categoryId: string, next: DraftProduct) {
    setCategories(
      (current) =>
        current?.map((category) =>
          category.id === categoryId
            ? { ...category, products: category.products.map((p) => (p.id === next.id ? next : p)) }
            : category
        ) ?? null
    );
  }

  function deleteProduct(categoryId: string, productId: string) {
    setCategories(
      (current) =>
        current
          ?.map((category) =>
            category.id === categoryId
              ? { ...category, products: category.products.filter((p) => p.id !== productId) }
              : category
          )
          .filter((category) => category.products.length > 0) ?? null
    );
  }

  function dropMissingPrices() {
    setCategories(
      (current) =>
        current
          ?.map((category) => ({
            ...category,
            products: category.products.filter((p) => p.price !== null),
          }))
          .filter((category) => category.products.length > 0) ?? null
    );
  }

  async function handleImport() {
    if (!categories || missingPriceCount > 0) return;
    setSaving(true);

    try {
      // Yeni kategoriler mevcutların ardına eklensin.
      const existing = await pb.collection("buyur_categories").getFullList({
        filter: pb.filter("business = {:id}", { id: business.id }),
        sort: "-order",
      });
      let categoryOrder = existing.length > 0 ? (existing[0].order ?? 0) + 1 : 0;

      for (const category of categories) {
        const created = await pb.collection("buyur_categories").create({
          business: business.id,
          name: category.name,
          description: "",
          order: categoryOrder++,
          // Taslak: kullanıcı ayrıca "yayınla" demedikçe menüde görünmez.
          is_active: publishNow,
        });

        // Ürünler paralel oluşturulur; kategori başına tur sayısı düşsün.
        await Promise.all(
          category.products.map((product, index) =>
            pb.collection("buyur_products").create({
              business: business.id,
              category: created.id,
              name: product.name,
              description: product.description,
              price: product.price ?? 0,
              images: product.image_url ? [product.image_url] : [],
              image_source: product.image_url ? product.image_source : null,
              is_available: publishNow,
              order: index,
            })
          )
        );
      }

      toast(
        publishNow
          ? `${totalProducts} ürün menünüze eklendi ve yayınlandı.`
          : `${totalProducts} ürün taslak olarak eklendi. Ürünler sayfasından yayınlayabilirsiniz.`
      );
      router.push("/panel/products");
    } catch {
      toast("Kaydedilirken bir hata oluştu.", "error");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ── 1. Yükleme ────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          <h3 className="mb-1 font-display text-lg font-bold">1 · Menünüzü yükleyin</h3>
          <p className="mb-4 text-sm text-ink-soft">
            Fiziksel menünüzün net çekilmiş fotoğraflarını veya PDF dosyasını seçin. Tek seferde en fazla{" "}
            {pagesPerScan} sayfa.
          </p>

          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full cursor-pointer text-sm text-ink-soft transition file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-crema file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-line"
          />

          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] overflow-hidden rounded-lg border border-line bg-crema"
                >
                  {file.isPdf ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                      <span className="font-mono text-[11px] font-bold text-paprika">PDF</span>
                      <span className="line-clamp-2 text-[10px] text-ink-soft">{file.name}</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.dataUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <AiButton onClick={handleScan} disabled={files.length === 0 || scanning}>
              {scanning ? "Taranıyor…" : "Menüyü Tara"}
            </AiButton>
          </div>
        </Card>

        <Card className="bg-crema/30">
          <p className="text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Yapay zekâ tahmin etmez.</strong> Okunamayan fiyat veya metin boş
            bırakılır ve işaretlenir. İçe aktarmadan önce bu alanları kontrol edin.
          </p>
        </Card>
      </div>

      {/* ── 2. Önizleme ve onay ───────────────────────────────── */}
      <div>
        {scanning && (
          <Card className="flex flex-col items-center justify-center gap-3 py-20 text-ink-soft">
            <Spinner className="h-8 w-8 text-paprika" />
            <p>Yapay zekâ menüyü inceliyor…</p>
            <p className="text-xs">Sayfa sayısına göre 5-20 saniye sürebilir.</p>
          </Card>
        )}

        {!scanning && !categories && (
          <Card className="flex items-center justify-center border-dashed py-20 text-center text-sm text-ink-soft">
            Tarama bitince kategoriler ve ürünler burada görünür.
          </Card>
        )}

        {!scanning && categories && (
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">2 · Kontrol edin ve onaylayın</h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {categories.length} kategori · {totalProducts} ürün
                  {currency && ` · ${currency}`}
                  {uncertainCount > 0 && ` · ${uncertainCount} alan kontrol bekliyor`}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleFindImages}
                disabled={findingImages}
              >
                {findingImages ? `Görsel aranıyor… %${imageProgress}` : "Görselleri otomatik bul"}
              </Button>
            </div>

            {missingPriceCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-paprika/40 bg-paprika/5 px-4 py-3">
                <p className="text-sm">
                  <strong>{missingPriceCount} ürünün fiyatı okunamadı.</strong>{" "}
                  <span className="text-ink-soft">
                    Yapay zekâ tahmin etmedi — fiyatları girin ya da bu ürünleri çıkarın.
                  </span>
                </p>
                <Button type="button" variant="ghost" onClick={dropMissingPrices}>
                  Bunları çıkar
                </Button>
              </div>
            )}

            <div className="max-h-[52vh] space-y-5 overflow-y-auto pr-1">
              {categories.map((category) => (
                <div key={category.id} className="rounded-xl border border-line p-4">
                  <input
                    value={category.name}
                    onChange={(e) =>
                      setCategories(
                        (current) =>
                          current?.map((c) =>
                            c.id === category.id ? { ...c, name: e.target.value } : c
                          ) ?? null
                      )
                    }
                    className="mb-3 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 font-display text-lg font-bold text-[var(--brand)] outline-none focus:border-line focus:bg-paper"
                  />
                  <div className="space-y-2">
                    {category.products.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        businessId={business.id}
                        categoryName={category.name}
                        onChange={(next) => updateProduct(category.id, next)}
                        onDelete={() => deleteProduct(category.id, product.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-4 border-t border-line pt-4">
              <Switch
                checked={publishNow}
                onChange={setPublishNow}
                label="İçe aktardıktan sonra hemen yayınla"
                description="Kapalıyken içerik taslak olarak eklenir ve menüde görünmez. Ürünler sayfasından tek tek yayınlayabilirsiniz."
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleImport}
                  loading={saving}
                  disabled={missingPriceCount > 0 || totalProducts === 0}
                >
                  <CheckCircleIcon size={16} />
                  {publishNow ? "Menüye ekle ve yayınla" : "Taslak olarak menüye ekle"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
