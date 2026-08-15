// Trafik kaynağı / cihaz atfı — saf fonksiyonlar (test edilebilir, IO yok).
// Kaynak önceliği: QR → utm_source → referrer host → direct (bkz. docs/analytics-architecture.md §5).

export const TRAFFIC_SOURCES = [
  "qr",
  "instagram",
  "google",
  "facebook",
  "whatsapp",
  "tiktok",
  "youtube",
  "campaign",
  "direct",
  "other",
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export const DEVICE_TYPES = ["mobile", "tablet", "desktop"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

const SOURCE_SET = new Set<string>(TRAFFIC_SOURCES);

// Referrer host → kaynak. Alt alan adları da eşleşsin diye "biter mi" kontrolü
// yapıyoruz (l.instagram.com, www.google.com.tr, m.facebook.com …).
const REFERRER_MAP: { hosts: string[]; source: TrafficSource }[] = [
  { hosts: ["instagram.com", "ig.me"], source: "instagram" },
  { hosts: ["facebook.com", "fb.com", "fb.me", "messenger.com"], source: "facebook" },
  { hosts: ["whatsapp.com", "wa.me"], source: "whatsapp" },
  { hosts: ["tiktok.com"], source: "tiktok" },
  { hosts: ["youtube.com", "youtu.be"], source: "youtube" },
];

/** google.com, google.com.tr, google.de … hepsi "google". */
function isGoogleHost(host: string): boolean {
  return /(^|\.)google(\.[a-z]{2,3}){1,2}$/.test(host);
}

export function sourceFromReferrerHost(host: string): TrafficSource | null {
  const clean = host.toLowerCase().replace(/^www\./, "");
  if (!clean) return null;
  if (isGoogleHost(clean)) return "google";
  for (const entry of REFERRER_MAP) {
    if (entry.hosts.some((h) => clean === h || clean.endsWith(`.${h}`))) return entry.source;
  }
  return null;
}

/** URL'den yalnızca host'u alır — tam referrer URL'i asla saklamıyoruz (§9). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export interface AttributionInput {
  /** ?qr= parametresi (etiketli QR kodu). */
  qrCode?: string;
  /** ?src= parametresi — "qr" gibi elle kurgulanmış kısa kaynak. */
  srcParam?: string;
  utmSource?: string;
  /** Tam referrer URL'i ya da host — ikisi de kabul edilir. */
  referrer?: string;
  /** Menünün kendi host'u; kendi içinden gelen referrer "direct" sayılır. */
  selfHost?: string;
}

export function normalizeSource(input: AttributionInput): TrafficSource {
  if (input.qrCode || input.srcParam?.toLowerCase() === "qr") return "qr";

  const utm = input.srcParam?.toLowerCase().trim() || input.utmSource?.toLowerCase().trim();
  if (utm) {
    if (SOURCE_SET.has(utm)) return utm as TrafficSource;
    // Tanınmayan utm_source değerleri "campaign" altında toplanır; ham değer
    // event'in campaign/medium alanlarında saklandığı için detay kaybolmuyor.
    return "campaign";
  }

  const host = input.referrer?.includes("://") ? hostOf(input.referrer) : (input.referrer ?? "").toLowerCase();
  if (!host) return "direct";
  const self = (input.selfHost ?? "").toLowerCase().replace(/^www\./, "");
  if (self && (host === self || host.endsWith(`.${self}`))) return "direct";

  return sourceFromReferrerHost(host) ?? "other";
}

export function deviceFromUserAgent(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (!ua) return "mobile"; // menü trafiğinin ezici çoğunluğu mobil; bilinmeyeni oraya yazmak en az yanıltıcı varsayım
  // Tablet önce: iPad ve "Android + Mobile içermeyen" cihazlar tablettir.
  if (ua.includes("ipad") || ua.includes("tablet") || (ua.includes("android") && !ua.includes("mobi"))) {
    return "tablet";
  }
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("ipod") || ua.includes("android")) {
    return "mobile";
  }
  return "desktop";
}
