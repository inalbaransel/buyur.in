"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { ProductForm } from "@/components/panel/product-form";
import { ProductOptionsEditor } from "@/components/panel/product-options-editor";
import { PageHeader } from "@/components/panel/ui";
import type { Category, Product } from "@/lib/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { business, isLoading: businessLoading } = useBusiness();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    load();
  }, [business, id]);

  async function load() {
    if (!business) return;
    setLoading(true);
    try {
      // requestKey: null -> React StrictMode'un dev'de effect'i iki kez
      // çalıştırması bu isteklerin SDK tarafından otomatik iptal edilmesine
      // yol açabilir; iptal edilen isteği "kayıt bulunamadı" sanmayalım.
      const [prod, cats] = await Promise.all([
        pb.collection("buyur_products").getOne<Product>(id, { requestKey: null }),
        pb.collection("buyur_categories").getFullList<Category>({
          filter: pb.filter("business = {:id}", { id: business.id }),
          requestKey: null,
          sort: "order,created",
        }),
      ]);
      setProduct(prod);
      setCategories(cats);
    } catch (err) {
      const isCancelled = err instanceof ClientResponseError && err.isAbort;
      if (!isCancelled) router.replace("/panel/products");
    } finally {
      setLoading(false);
    }
  }

  if (businessLoading || loading || !business || !product) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  return (
    <div>
      <PageHeader title={product.name} />
      <div className="space-y-8">
        <ProductForm
          business={business}
          categories={categories}
          initial={product}
          onSaved={(updated) => {
            setProduct(updated);
          }}
        />
        <ProductOptionsEditor business={business} productId={product.id} />
      </div>
    </div>
  );
}
