"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMenu } from "@/components/menu/menu-provider";
import { CategoryTabs } from "@/components/menu/category-tabs";
import { FadeImg } from "@/components/menu/fade-img";
import { ArrowLeftIcon, BadgeIcon, SearchIcon } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import { badgeLabels } from "@/lib/labels";
import { isRTLLocale } from "@/lib/i18n";
import type { Category, Product } from "@/lib/types";

/** Görselsiz kategori/ürün karesi — kırık ikon yerine markanın tonunda doku. */
function PlaceholderArt() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{ color: "var(--brand-text)" }}
    >
      <defs>
        <pattern id="menu-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="currentColor" opacity="0.15" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#menu-dots)" />
      <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.08" />
      <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.04" />
      <g transform="translate(38, 38)" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </g>
    </svg>
  );
}

/** Kategori karosu. `wide` olan ilk kart tam genişlik kaplar — menünün en üstü
 *  düz bir ızgara yerine bir kapak gibi açılır. */
function CategoryTile({ category, image, count, wide }: { category: Category; image?: string; count: number; wide: boolean }) {
  const { base, locale, t, tf } = useMenu();
  const description = tf(category, "description");

  return (
    <Link
      href={`${base}/categories/${category.id}`}
      data-reveal
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-colors hover:border-[var(--brand)] ${
        wide ? "col-span-2 sm:col-span-3" : ""
      }`}
    >
      <div className={`relative w-full overflow-hidden bg-crema ${wide ? "aspect-[16/7]" : "aspect-[4/3]"}`}>
        {image ? (
          <picture>
            <FadeImg
              src={image}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </picture>
        ) : (
          <PlaceholderArt />
        )}
        {/* Ürün sayısı görselin üstünde: başlık satırı yalnızca isme kalır */}
        <span
          className="absolute end-2 top-2 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider shadow-sm"
          style={{ background: "var(--brand)", color: "var(--brand-on)" }}
        >
          {t("productCount", { count })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold leading-tight">{tf(category, "name")}</p>
          {wide && description && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-soft">{description}</p>}
        </div>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crema transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--brand-text)" }}
        >
          <ArrowLeftIcon size={14} className={isRTLLocale(locale) ? undefined : "rotate-180"} />
        </span>
      </div>
    </Link>
  );
}

/** Öne çıkan ürün kartı — yatay şeritte, dokunmatik kaydırma için dar. */
function FeaturedCard({ product }: { product: Product }) {
  const { base, locale, tf } = useMenu();
  const image = product.images?.[0];
  const hasDiscount = product.discount_percent > 0;
  const finalPrice = hasDiscount ? product.price * (1 - product.discount_percent / 100) : product.price;
  const badge = product.badges?.[0];
  const badgeText = product.campaign_label ? tf(product, "campaign_label") : badge ? badgeLabels[locale][badge] : null;

  return (
    <Link
      href={`${base}/products/${product.id}`}
      className="group w-[150px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-paper transition-colors hover:border-[var(--brand)]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-crema">
        {image ? (
          <picture>
            <FadeImg
              src={image}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </picture>
        ) : (
          <PlaceholderArt />
        )}
        {badgeText && (
          <span
            className="absolute start-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider shadow-sm"
            style={{ background: "var(--brand)", color: "var(--brand-on)" }}
          >
            {!product.campaign_label && badge && <BadgeIcon badge={badge} size={10} strokeWidth={2.2} />}
            {badgeText}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2.5">
        <p className="line-clamp-2 min-h-[2.4em] font-display text-[13px] font-bold leading-tight">{tf(product, "name")}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          {hasDiscount && <span className="font-mono text-[10px] text-ink-soft line-through">{formatPrice(product.price)}</span>}
          <span className="font-mono text-[13px] font-semibold text-[var(--brand-text)]">{formatPrice(finalPrice)}</span>
        </p>
      </div>
    </Link>
  );
}

export default function MenuCategoriesPage() {
  const { base, business, categories, products, categoriesLoading, imageByCategory, productCountByCategory, t, tf } =
    useMenu();

  // Öne çıkanlar uydurulmaz: yalnızca işletmenin kendi işaretlediği ürünler
  // (kampanya etiketi, indirim ya da rozet). Üçten azsa şerit hiç basılmaz.
  const featured = useMemo(
    () => products.filter((p) => p.campaign_label || p.discount_percent > 0 || (p.badges?.length ?? 0) > 0).slice(0, 10),
    [products]
  );

  if (categoriesLoading) {
    return <p className="py-20 text-center text-ink-soft">{t("loading")}</p>;
  }

  if (categories.length === 0) {
    return <p className="py-20 text-center text-ink-soft">{t("menuPreparing")}</p>;
  }

  const description = tf(business, "description");

  return (
    <div className="pb-6">
      <CategoryTabs />

      {/* İşletmenin kendi tanıtım cümlesi + menüde arama kısayolu */}
      <div className="px-4 pt-4">
        {description && <p className="text-sm leading-relaxed text-ink-soft">{description}</p>}
        <Link
          href={`${base}/search`}
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-crema/60 px-3.5 py-3 text-sm text-ink-soft transition-colors hover:border-[var(--brand)]"
        >
          <SearchIcon size={16} />
          {t("menuSearchCta")}
        </Link>
      </div>

      {featured.length >= 3 && (
        <section className="pt-6">
          <h2 className="px-4 font-display text-lg font-extrabold tracking-tight">{t("menuFeatured")}</h2>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
            {featured.map((product) => (
              <FeaturedCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="pt-6">
        <h2 className="px-4 font-display text-lg font-extrabold tracking-tight">{t("menuAllCategories")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {categories.map((cat, i) => (
            <CategoryTile
              key={cat.id}
              category={cat}
              image={cat.image_url || imageByCategory.get(cat.id)}
              count={productCountByCategory.get(cat.id) ?? 0}
              wide={i === 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
