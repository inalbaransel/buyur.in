"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { CategoryForm } from "@/components/panel/category-form";
import { PageHeader } from "@/components/panel/ui";
import type { Category } from "@/lib/types";

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { business, isLoading: businessLoading } = useBusiness();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!business) return;
    // requestKey: null -> React StrictMode'un dev'de effect'i iki kez
    // çalıştırması bu isteği SDK'nın otomatik iptal etmesine yol açabilir;
    // iptal edilen isteği "kayıt bulunamadı" sanıp listeye atmayalım.
    pb.collection("buyur_categories")
      .getOne<Category>(id, { requestKey: null })
      .then(setCategory)
      .catch((err) => {
        const isCancelled = err instanceof ClientResponseError && err.isAbort;
        if (!isCancelled) router.replace("/panel/categories");
      })
      .finally(() => setLoading(false));
  }, [business, id, router]);

  if (businessLoading || loading || !business || !category) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  return (
    <div>
      <PageHeader title={category.name} description={savedAt ? "Kaydedildi ✓" : undefined} />
      <CategoryForm
        business={business}
        initial={category}
        onSaved={(updated) => {
          setCategory(updated);
          setSavedAt(Date.now());
        }}
      />
    </div>
  );
}
