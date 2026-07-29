"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { ProductForm } from "@/components/panel/product-form";
import { Button, EmptyState, PageHeader, UpgradeNotice } from "@/components/panel/ui";
import { fetchPlanLimits } from "@/lib/plan-limits";
import type { Category } from "@/lib/types";

export default function NewProductPage() {
  const { business, isLoading } = useBusiness();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);

  useEffect(() => {
    if (!business) return;
    pb.collection("menuva_categories")
      .getFullList<Category>({ filter: pb.filter("business = {:id}", { id: business.id }), sort: "order,created" })
      .then((list) => {
        setCategories(list);
        setLoadingCats(false);
      });
  }, [business]);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    async function checkLimit() {
      const [limits, existing] = await Promise.all([
        fetchPlanLimits(business!.plan),
        pb.collection("menuva_products").getList(1, 1, { filter: pb.filter("business = {:id}", { id: business!.id }) }),
      ]);
      if (cancelled) return;
      setLimitReached(limits.max_products !== null && existing.totalItems >= limits.max_products);
      setCheckingLimit(false);
    }
    checkLimit();
    return () => {
      cancelled = true;
    };
  }, [business]);

  if (isLoading || loadingCats || checkingLimit || !business) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  if (limitReached) {
    return (
      <UpgradeNotice
        title="Ürün limitine ulaştın"
        description="Mevcut planının ürün limitini doldurdun. Daha fazla ürün eklemek için planını yükseltmen gerekiyor."
      />
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Önce bir kategori oluştur"
        description="Ürün eklemeden önce en az bir kategori gerekiyor."
        action={
          <Link href="/panel/categories">
            <Button>Kategori oluştur</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title="Yeni ürün" />
      <ProductForm
        business={business}
        categories={categories}
        onSaved={(product) => router.replace(`/panel/product/${product.id}`)}
        onCancel={() => router.back()}
      />
    </div>
  );
}
