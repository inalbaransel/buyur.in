"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMenu } from "@/components/menu/menu-provider";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { ArrowLeftIcon } from "@/components/icons";

export function CategoryDrawer({ onClose }: { onClose: () => void }) {
  const { business, base, categories, imageByCategory, productCountByCategory, t, tf } = useMenu();
  // Açıkken arkadaki menü kaymasın.
  useBodyScrollLock(true);
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div
        className="relative flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {business.logo_url ? (
              <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line bg-paper">
                <picture>
                  <img src={business.logo_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </picture>
              </span>
            ) : null}
            <span className="truncate font-display text-base font-bold leading-tight">{tf(business, "name")}</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-crema"
          >
            ✕
          </button>
        </div>

        <p className="px-5 pt-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft">{t("categoriesLabel")}</p>

        <nav className="flex flex-col gap-1 px-3 py-3">
          {categories.map((cat) => {
            const href = `${base}/categories/${cat.id}`;
            const active = pathname === href;
            const image = cat.image_url || imageByCategory.get(cat.id);
            const count = productCountByCategory.get(cat.id) ?? 0;
            return (
              <Link
                key={cat.id}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-crema/60"
                style={active ? { background: "color-mix(in srgb, var(--brand) 14%, transparent)" } : undefined}
              >
                <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-crema">
                  {image && (
                    <picture>
                      <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    </picture>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-display text-[15px] font-bold leading-tight"
                    style={active ? { color: "var(--brand-text)" } : undefined}
                  >
                    {tf(cat, "name")}
                  </span>
                  <span className="block font-mono text-[11px] text-ink-soft">{t("productCount", { count })}</span>
                </span>
                <ArrowLeftIcon size={16} className="rotate-180 shrink-0 text-ink-soft" />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
