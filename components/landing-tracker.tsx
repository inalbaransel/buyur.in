"use client";

import { useEffect } from "react";
import { captureAttribution, trackMarketingEvent } from "@/lib/marketing-events";

// Landing ölçümü, bileşenleri istemciye çevirmeden: sunucu bileşenleri yalnızca
// işaret koyar, olayları burası gönderir.
//   data-track="cta_click" data-track-location="hero" → tıklama olayı + özellikler
//   data-track-view="pricing_viewed"                  → bölüm ekrana girince bir kez
// Ayrıca ilk ziyaretin UTM/yönlendiren bilgisi saklanır (kayıt olayına eklenir).

function propsFrom(element: HTMLElement): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (!value || !key.startsWith("track") || key === "track" || key === "trackView") continue;
    const name = key.slice("track".length);
    props[name.charAt(0).toLowerCase() + name.slice(1)] = value;
  }
  return props;
}

export function LandingTracker() {
  useEffect(() => {
    captureAttribution();

    function onClick(event: MouseEvent) {
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      const name = element?.dataset.track;
      if (element && name) trackMarketingEvent(name, propsFrom(element));
    }
    document.addEventListener("click", onClick, { capture: true });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          if (element.dataset.trackView) trackMarketingEvent(element.dataset.trackView);
        }
      },
      { threshold: 0.3 }
    );
    document.querySelectorAll<HTMLElement>("[data-track-view]").forEach((element) => observer.observe(element));

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      observer.disconnect();
    };
  }, []);

  return null;
}
