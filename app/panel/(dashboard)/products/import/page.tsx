"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { useToast } from "@/components/panel/toast";
import { Button, Card, PageHeader, AiButton, Input, Textarea } from "@/components/panel/ui";
import { PencilIcon, TrashIcon, CheckCircleIcon } from "@/components/icons";

interface ExtractedCategory {
  name: string;
  products: { id: string; name: string; description: string; price: number }[];
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function EditableProductRow({
  product,
  onSave,
  onDelete,
}: {
  product: { id: string; name: string; description: string; price: number };
  onSave: (p: typeof product) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [desc, setDesc] = useState(product.description);
  const [price, setPrice] = useState(product.price);

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-crema p-4 border border-line shadow-sm">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ürün Adı" className="py-2" />
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Açıklama" className="py-2 min-h-[70px]" />
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2">
            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Fiyat" className="w-24 py-2" />
            <span className="font-mono text-sm text-ink-soft">₺</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              onSave({ ...product, name, description: desc, price });
              setEditing(false);
            }} 
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-paprika"
          >
            <CheckCircleIcon size={16} /> Kaydet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{product.name}</p>
        {product.description && <p className="text-sm text-ink-soft mt-0.5 break-words">{product.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="font-mono font-bold mr-2">{product.price}₺</p>
        <div className="flex gap-1 md:opacity-0 transition-opacity md:group-hover:opacity-100">
          <button type="button" onClick={() => setEditing(true)} className="rounded p-1.5 text-ink-soft hover:bg-crema hover:text-[var(--brand)] transition-colors" title="Düzenle">
            <PencilIcon size={16} />
          </button>
          <button type="button" onClick={onDelete} className="rounded p-1.5 text-ink-soft hover:bg-crema hover:text-paprika transition-colors" title="Sil">
            <TrashIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImportMenuPage() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const router = useRouter();
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedCategory[] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles(newFiles);
    
    const newPreviews: string[] = [];
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          newPreviews.push(ev.target.result as string);
          if (newPreviews.length === newFiles.length) {
            setPreviews(newPreviews);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleScan() {
    if (previews.length === 0 || !business) return;
    setLoading(true);
    setExtracted(null);

    try {
      const res = await fetch("/api/ai/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": pb.authStore.token,
        },
        body: JSON.stringify({
          businessId: business.id,
          images: previews,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Tarama başarısız oldu.");
      }

      const data = await res.json();
      if (data.categories && Array.isArray(data.categories)) {
        const withIds = data.categories.map((c: any) => ({
          name: c.name,
          products: (c.products || []).map((p: any) => ({
            ...p,
            id: generateId(),
          }))
        }));
        setExtracted(withIds);
        toast("Menü başarıyla tarandı. Düzenleyip kaydedebilirsiniz.");
      } else {
        throw new Error("Geçersiz veri formatı döndü.");
      }
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function updateProduct(catIndex: number, product: any) {
    if (!extracted) return;
    const next = [...extracted];
    const pIndex = next[catIndex].products.findIndex((p) => p.id === product.id);
    if (pIndex !== -1) {
      next[catIndex].products[pIndex] = product;
      setExtracted(next);
    }
  }

  function deleteProduct(catIndex: number, productId: string) {
    if (!extracted) return;
    const next = [...extracted];
    next[catIndex].products = next[catIndex].products.filter((p) => p.id !== productId);
    setExtracted(next);
  }

  async function handleSave() {
    if (!extracted || !business) return;
    setSaving(true);

    try {
      const existingCats = await pb.collection("menuva_categories").getFullList({
        filter: pb.filter("business = {:id}", { id: business.id }),
        sort: "-order",
      });
      let baseCatOrder = existingCats.length > 0 ? existingCats[0].order + 1 : 0;

      for (const cat of extracted) {
        // Boş kategorileri ekleme
        if (cat.products.length === 0) continue;

        const catRecord = await pb.collection("menuva_categories").create({
          business: business.id,
          name: cat.name,
          order: baseCatOrder++,
          is_active: true,
        });

        let prodOrder = 0;
        for (const prod of cat.products) {
          await pb.collection("menuva_products").create({
            business: business.id,
            category: catRecord.id,
            name: prod.name,
            description: prod.description || "",
            price: prod.price || 0,
            is_available: true,
            order: prodOrder++,
          });
        }
      }

      toast("Tüm ürünler menüye eklendi!");
      router.push("/panel/products");
    } catch (err: any) {
      toast("Kaydedilirken bir hata oluştu.", "error");
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader 
        title="AI ile Menü İçe Aktar" 
        description="Fiziksel menünüzün fotoğraflarını yükleyin, yapay zeka sizin için ürünleri oluştursun." 
        action={
          <Link href="/panel/products">
            <Button variant="outline">Geri Dön</Button>
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2 mt-6">
        <div className="space-y-4">
          <Card>
            <h3 className="font-display font-bold text-lg mb-4">1. Menü Fotoğraflarını Yükle</h3>
            <p className="text-sm text-ink-soft mb-4">Menünüzün okunaklı ve net çekilmiş fotoğraflarını seçin. Çoklu sayfa yükleyebilirsiniz.</p>
            <input 
              type="file" 
              multiple 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-full file:border-0 file:bg-crema file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-line transition cursor-pointer"
            />

            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-line bg-crema">
                    <img src={src} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <AiButton onClick={handleScan} disabled={previews.length === 0 || loading}>
                {loading ? "Taranıyor..." : "Fotoğrafları Tara"}
              </AiButton>
            </div>
          </Card>
        </div>

        <div>
          {loading && (
            <Card className="flex flex-col items-center justify-center py-20 text-ink-soft">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-crema border-t-[var(--brand)] mb-4"></div>
              <p>Yapay zeka menüyü inceliyor...</p>
              <p className="text-xs mt-2">Bu işlem fotoğraf sayısına göre 5-15 saniye sürebilir.</p>
            </Card>
          )}

          {!loading && extracted && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-lg">2. Önizleme ve Onay</h3>
                <Button onClick={handleSave} loading={saving}>Menüye Ekle</Button>
              </div>
              
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {extracted.map((cat, i) => (
                  <div key={i} className="rounded-xl border border-line p-4">
                    <h4 className="font-display font-bold text-lg text-[var(--brand)] mb-3">{cat.name}</h4>
                    <div className="space-y-3">
                      {cat.products.map((prod) => (
                        <EditableProductRow 
                          key={prod.id} 
                          product={prod} 
                          onSave={(p) => updateProduct(i, p)} 
                          onDelete={() => deleteProduct(i, prod.id)} 
                        />
                      ))}
                      {cat.products.length === 0 && (
                        <p className="text-sm text-ink-soft italic">Bu kategoride ürün kalmadı.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!loading && !extracted && (
            <Card className="flex items-center justify-center py-20 text-ink-soft bg-crema/20 border-dashed">
              <p>Önizleme alanı. Tarama bitince sonuçlar burada görünür.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
