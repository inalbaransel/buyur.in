import type { TrackPayload } from "@/lib/analytics/events";

// Menü tarafındaki ince istemci: yalnızca "ne oldu"yu bildirir. Oturum, kaynak,
// cihaz ve konum /api/track içinde sunucuda üretilir (bkz. docs/analytics-architecture.md §2).
// Hiçbir hata menüyü etkilemez — istek sessizce düşer.

const ENTRY_KEY = "mv_entry";
const SEEN_KEY = "mv_seen";
/** Oturum başına tekilleştirilen event anahtarı üst sınırı (sessionStorage şişmesin). */
const SEEN_LIMIT = 300;

interface EntryParams {
  qr?: string;
  src?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  path?: string;
}

let entryCache: EntryParams | null = null;

/** İlk temas parametreleri: sayfa değişince URL'den kaybolabildikleri için
 *  sekme oturumunda saklanır. Sunucu bunları yalnızca yeni oturum açarken kullanır. */
function entryParams(): EntryParams {
  if (entryCache) return entryCache;
  if (typeof window === "undefined") return {};

  try {
    const stored = window.sessionStorage.getItem(ENTRY_KEY);
    if (stored) {
      entryCache = JSON.parse(stored) as EntryParams;
      return entryCache;
    }
  } catch {
    /* sessionStorage kapalı olabilir (gizli sekme kısıtları) */
  }

  const params = new URLSearchParams(window.location.search);
  const entry: EntryParams = {
    qr: params.get("qr") ?? undefined,
    src: params.get("src") ?? undefined,
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
    path: window.location.pathname,
  };

  entryCache = entry;
  try {
    window.sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
  } catch {
    /* yoksay */
  }
  return entry;
}

export function trackEvent(slug: string, payload: TrackPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    slug,
    ...payload,
    path: payload.path ?? window.location.pathname,
    entry: entryParams(),
  });

  // keepalive: sayfa kapanırken/gezinirken de isteğin tamamlanmasına izin verir.
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    /* analitik sessizce düşer */
  });
}

function seenKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Aynı olayı oturum başına bir kez gönderir (ör. ürün listede görüldü).
 *  Anahtar sekme oturumunda saklanır; sayfa yenilense de tekrar sayılmaz. */
export function trackOnce(key: string, run: () => void): void {
  if (typeof window === "undefined") return;
  const keys = seenKeys();
  if (keys.has(key)) return;

  keys.add(key);
  try {
    const list = Array.from(keys);
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-SEEN_LIMIT)));
  } catch {
    /* yoksay */
  }
  run();
}
