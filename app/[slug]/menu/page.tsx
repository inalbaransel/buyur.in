"use client";

import Link from "next/link";
import { useMenu } from "@/components/menu/menu-provider";
import { CategoryTabs } from "@/components/menu/category-tabs";
import { ArrowLeftIcon } from "@/components/icons";

export default function MenuCategoriesPage() {
  const { base, categories, categoriesLoading, imageByCategory, productCountByCategory, t, tf } = useMenu();

  if (categoriesLoading) {
    return <p className="py-20 text-center text-ink-soft">{t("loading")}</p>;
  }

  if (categories.length === 0) {
    return <p className="py-20 text-center text-ink-soft">{t("menuPreparing")}</p>;
  }

  return (
    <div>
      <CategoryTabs />
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        {categories.map((cat) => {
          const image = cat.image_url || imageByCategory.get(cat.id);
          const count = productCountByCategory.get(cat.id) ?? 0;
          const name = tf(cat, "name");
          return (
            <Link
              key={cat.id}
              href={`${base}/categories/${cat.id}`}
              data-reveal
              className="group flex flex-col overflow-hidden rounded-xl border border-line bg-paper transition-colors hover:border-[var(--brand)]"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-crema">
                {image ? (
                  <picture>
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </picture>
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-ink-soft/40"
                    style={{ color: "var(--brand-text)" }}
                  >
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1.2" fill="currentColor" opacity="0.15" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#dots)" />
                      <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.08" />
                      <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.04" />
                      <g transform="translate(38, 38)" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </g>
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold leading-tight">{name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-soft">{t("productCount", { count })}</p>
                </div>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crema"
                  style={{ color: "var(--brand-text)" }}
                >
                  <ArrowLeftIcon size={14} className="rotate-180" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
