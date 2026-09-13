import { track } from "@vercel/analytics";
import { hostOf } from "@/lib/analytics/attribution";

// Pazarlama hunisinin ölçümü (landing → kayıt → aktivasyon). Menü ziyaretçi
// analitiğinden (/api/track) tamamen ayrı: burada işletme sahibinin yolculuğu
// ölçülür. Olaylar Vercel Analytics'e ve (yüklüyse) GA4'e gider.
//
// Olay sözlüğü (ölçüm planı):
//   cta_click            → props.location (hero/nav/pricing/final…) + props.cta
//   pricing_viewed       → fiyat bölümü ekrana girdi
//   social_proof_viewed  → sosyal kanıt bölümü ekrana girdi
//   live_demo_open       → canlı demo menü açıldı
//   plan_cta             → props.plan
//   whatsapp_lead        → props.location
//   signup_completed     → props.plan_intent
//   business_created     → props.sector
//   activation_qr_download / activation_checklist_complete

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

const ATTRIBUTION_KEY = "menuva-attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  referrer?: string;
  landing_path?: string;
  first_seen_at?: string;
};

/** İlk temas atfını (UTM + yönlendiren site) saklar; sonraki ziyaretler ezmez. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(ATTRIBUTION_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) attribution[key] = value.slice(0, 80);
    }
    const referrer = document.referrer ? hostOf(document.referrer) : "";
    if (referrer && referrer !== window.location.hostname.replace(/^www\./, "")) attribution.referrer = referrer;
    attribution.landing_path = window.location.pathname;
    attribution.first_seen_at = new Date().toISOString();

    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* depolama kapalı: atıf tutulamaz */
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) ?? "{}") as Attribution;
  } catch {
    return {};
  }
}

function clean(props: EventProps): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === "") continue;
    out[key] = value;
  }
  return out;
}

export function trackMarketingEvent(name: string, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  const own = clean(props);
  try {
    track(name, own);
  } catch {
    /* analitik sessizce düşer */
  }
  try {
    // GA4'e atıf da eklenir: "hangi kampanya kayıt getirdi" sorusu buradan cevaplanır.
    window.gtag?.("event", name, { ...own, ...clean(getAttribution()) });
  } catch {
    /* yoksay */
  }
}
