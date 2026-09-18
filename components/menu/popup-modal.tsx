"use client";

import type { Popup } from "@/lib/types";
import { useMenu } from "@/components/menu/menu-provider";

export function PopupModal({ popup, onClose }: { popup: Popup; onClose: () => void }) {
  const { t, tf } = useMenu();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {popup.image_url && (
          <div className="relative h-40 w-full">
            <picture>
              <img src={popup.image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </picture>
          </div>
        )}
        <div className="p-6 text-center">
          <h2 className="font-display text-xl font-bold">{tf(popup, "title")}</h2>
          {popup.message && <p className="mt-2 text-sm text-ink-soft">{tf(popup, "message")}</p>}
          <button
            onClick={onClose}
            style={{ background: "var(--brand)", color: "var(--brand-on)" }}
            className="mt-5 rounded-md px-6 py-2.5 font-mono text-[13px] uppercase tracking-wider transition-opacity hover:opacity-90"
          >
            {t("viewMenu")}
          </button>
        </div>
      </div>
    </div>
  );
}
