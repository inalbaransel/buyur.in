"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent, trackOnce } from "@/lib/analytics/track-client";
import type { Product, Template } from "@/lib/types";
import { allergenLabels, badgeLabels } from "@/lib/labels";
import { formatPrice } from "@/lib/format";
import { BadgeIcon, CheckCircleIcon, ClockIcon, FlameIcon, ImageIcon } from "@/components/icons";
import { FadeImg } from "@/components/menu/fade-img";
import { useMenu } from "@/components/menu/menu-provider";

export function ProductCard({
  product,
  template,
  onAdd,
  onOpen,
}: {
  product: Product;
  template: Template;
  onAdd: (product: Product) => void;
  onOpen?: () => void;
}) {
  const { business, locale, t, tf } = useMenu();
  const [added, setAdded] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hasDiscount = product.discount_percent > 0;

  // Ürün listede gerçekten görüldüğünde bir "product_view" — oturum başına ürün
  // başına bir kez. Detay açılışı ayrı event (product_detail_view), böylece
  // funnel'da "gördü → detaya girdi" adımı ölçülebiliyor.
  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        trackOnce(`product_view:${product.id}`, () => {
          trackEvent(business.slug, {
            type: "product_view",
            target: product.id,
            label: product.name,
            productId: product.id,
            categoryId: product.category,
            locale,
          });
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [product.id, product.name, product.category, business.slug, locale]);

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    onAdd(product);
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1100);
  }
  const finalPrice = hasDiscount ? product.price * (1 - product.discount_percent / 100) : product.price;
  const image = product.images?.[0];
  const isGrid = template === "grid";
  const name = tf(product, "name");
  const description = tf(product, "description");

  return (
    <div
      ref={cardRef}
      onClick={onOpen}
      data-reveal
      className={`group rounded-xl border border-line bg-paper p-4 transition-colors hover:border-[var(--brand)] ${
        onOpen ? "cursor-pointer " : ""
      }${isGrid ? "flex flex-col" : "flex gap-4"}`}
    >
      <div
        className={
          isGrid
            ? "relative mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-crema text-ink-soft/30"
            : "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-crema text-ink-soft/30"
        }
      >
        {image && !imageBroken ? (
          <picture>
            <FadeImg
              src={image}
              alt={name}
              loading="lazy"
              // Görsel kaynağından gelir; kaynak ölürse kırık ikon yerine
              // kartın görselsiz hâline düşülür.
              onError={() => setImageBroken(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        ) : (
          <ImageIcon size={isGrid ? 48 : 32} strokeWidth={1.2} />
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-bold leading-tight">{name}</h3>
          <div className="shrink-0 text-right">
            {hasDiscount && <p className="font-mono text-xs text-ink-soft line-through">{formatPrice(product.price)}</p>}
            <p className="font-mono text-base font-semibold text-[var(--brand-text)]">{formatPrice(finalPrice)}</p>
          </div>
        </div>

        {(product.badges?.length > 0 || product.campaign_label) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {product.badges?.map((b) => (
              <span
                key={b}
                className="flex items-center gap-1 rounded-full bg-crema px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft"
              >
                <BadgeIcon badge={b} size={11} strokeWidth={2.2} />
                {badgeLabels[locale][b]}
              </span>
            ))}
            {product.campaign_label && (
              <span className="rounded-full bg-herb/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-herb">
                {tf(product, "campaign_label")}
              </span>
            )}
          </div>
        )}

        {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>}

        {(product.prep_time_min > 0 || product.calories > 0) && (
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-ink-soft">
            {product.prep_time_min > 0 && (
              <span className="flex items-center gap-1">
                <ClockIcon size={12} />
                {product.prep_time_min}
                {product.prep_time_max > product.prep_time_min ? `-${product.prep_time_max}` : ""} {t("minUnit")}
              </span>
            )}
            {product.calories > 0 && (
              <span className="flex items-center gap-1">
                <FlameIcon size={12} />
                {product.calories} kcal
              </span>
            )}
          </div>
        )}

        {product.allergens?.length > 0 && (
          <p className="mt-1 text-[11px] text-ink-soft">
            {t("allergenPrefix")}: {product.allergens.map((a) => allergenLabels[locale][a]).join(", ")}
          </p>
        )}

        <button
          onClick={handleAdd}
          className={`mt-3 flex items-center gap-1.5 self-start rounded-md border px-4 py-1.5 font-mono text-[12px] uppercase tracking-wider transition-colors ${
            added
              ? "cart-pop border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-on)]"
              : "border-[var(--brand)] text-[var(--brand-text)] hover:bg-[var(--brand)] hover:text-[var(--brand-on)]"
          }`}
        >
          {added ? (
            <>
              <CheckCircleIcon size={14} strokeWidth={2.2} />
              {t("addToCart")}
            </>
          ) : (
            <>+ {t("addToCart")}</>
          )}
        </button>
      </div>
    </div>
  );
}
