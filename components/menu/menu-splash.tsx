"use client";

import { useEffect, useState } from "react";
import { useMenu } from "@/components/menu/menu-provider";

// Menü, kapanış süresi dolsa da açılır: yavaş ağda ziyaretçi splash'te
// takılı kalmasın (menü sayfası mobilde 2 sn altında açılmalı).
const MAX_WAIT_MS = 1600;
// Görsel zaten önbellekteyse splash'in anlık çakıp gitmemesi için alt sınır.
const MIN_SHOW_MS = 700;

function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Menü ilk açılırken logo ve ilk görseller inene kadar yazılı bir açılış
 *  ekranı gösterir; hazır olunca yumuşakça kapanır. Aynı oturumda tekrar
 *  gösterilmez. */
export function MenuSplash() {
  const { business, categories, imageByCategory, tf, t } = useMenu();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const key = `buyur-splash-${business.slug}`;
    try {
      if (window.sessionStorage.getItem(key)) {
        setVisible(false);
        return;
      }
    } catch {
      /* sessionStorage kapalı: splash'i her seferinde göstermek zararsız */
    }

    // Ekrana ilk gelecek görseller: logo, kapak ve ilk kategori kareleri.
    const urls = [
      business.logo_url,
      business.cover_url,
      ...categories.slice(0, 4).map((c) => c.image_url || imageByCategory.get(c.id)),
    ].filter((u): u is string => Boolean(u));

    let cancelled = false;
    const started = Date.now();
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));

    Promise.race([Promise.all(urls.map(preload)).then(() => undefined), timeout]).then(() => {
      if (cancelled) return;
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - started));
      setTimeout(() => {
        if (cancelled) return;
        try {
          window.sessionStorage.setItem(key, "1");
        } catch {
          /* yoksay */
        }
        setLeaving(true);
        setTimeout(() => !cancelled && setVisible(false), 450);
      }, wait);
    });

    return () => {
      cancelled = true;
    };
    // Yalnızca ilk açılışta çalışır; sonraki veri/dil değişimi yeniden tetiklememeli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-paper px-8 text-center transition-opacity duration-[450ms] ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {business.logo_url ? (
        <span className="splash-pop relative block h-20 w-20 overflow-hidden rounded-3xl border border-line bg-crema">
          <picture>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.logo_url} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
        </span>
      ) : null}

      <div className="splash-pop" style={{ animationDelay: "0.08s" }}>
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{tf(business, "name")}</h1>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-wider text-ink-soft">{t("splashMessage")}</p>
      </div>

      {/* Üç nokta — marka renginde, sırayla yanar */}
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="splash-dot h-2 w-2 rounded-full"
            style={{ background: "var(--brand)", animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}
