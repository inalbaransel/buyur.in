"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { CategoryForm } from "@/components/panel/category-form";
import { PageHeader } from "@/components/panel/ui";

export default function NewCategoryPage() {
  const { business, isLoading } = useBusiness();
  const router = useRouter();
  const [nextOrder, setNextOrder] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    if (!business) return;
    pb.collection("buyur_categories")
      .getList(1, 1, { filter: pb.filter("business = {:id}", { id: business.id }) })
      .then((res) => {
        setNextOrder(res.totalItems);
        setLoadingCount(false);
      });
  }, [business]);

  if (isLoading || loadingCount || !business) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  return (
    <div>
      <PageHeader title="Yeni kategori" />
      <CategoryForm
        business={business}
        order={nextOrder}
        onSaved={() => router.replace("/panel/categories")}
        onCancel={() => router.back()}
      />
    </div>
  );
}
