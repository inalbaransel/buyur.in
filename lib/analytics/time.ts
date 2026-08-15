// İşletme saat dilimine göre gün/saat hesapları. Analitikteki bütün gün
// sınırları (bugün, dün, son 7 gün…) işletmenin saati üzerinden çizilir —
// sunucunun ya da tarayıcının saat dilimi hiçbir yerde referans alınmaz.

import type { Business } from "@/lib/types";

export const DEFAULT_TIMEZONE = "Europe/Istanbul";

export function businessTimezone(business: Pick<Business, "timezone">): string {
  const tz = business.timezone?.trim();
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    // Geçersiz bir IANA adı kaydedilmiş olabilir; doğrulayıp varsayılana düşüyoruz.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string): Intl.DateTimeFormat {
  let cached = partsCache.get(timezone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
    });
    partsCache.set(timezone, cached);
  }
  return cached;
}

export interface ZonedParts {
  /** YYYY-MM-DD */
  date: string;
  /** 0-23 */
  hour: number;
  /** 0 = Pazartesi … 6 = Pazar (Türkiye'de hafta pazartesi başlar). */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function zonedParts(date: Date, timezone: string): ZonedParts {
  const parts = formatter(timezone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number.parseInt(get("hour"), 10) % 24,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** Verilen anın işletme saatindeki gün anahtarı (YYYY-MM-DD). */
export function dayKey(date: Date, timezone: string): string {
  return zonedParts(date, timezone).date;
}

/** İki gün anahtarı arasındaki tüm günler (uçlar dahil). */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Gün anahtarına gün ekler/çıkarır (UTC aritmetiği; anahtarlar zaten yerel gün). */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** İki gün anahtarı arasındaki gün sayısı (uçlar dahil). */
export function dayCount(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

const offsetCache = new Map<string, Intl.DateTimeFormat>();

/** Verilen anda saat diliminin UTC'ye göre farkı (ms; doğuda pozitif). */
export function zonedOffsetMs(date: Date, timezone: string): number {
  let dtf = offsetCache.get(timezone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    offsetCache.set(timezone, dtf);
  }

  const parts = dtf.formatToParts(date);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  // "Yerel duvar saati"ni UTC'ymiş gibi okuyup gerçek ana göre farkını alıyoruz.
  const asUtc = Date.UTC(num("year"), num("month") - 1, num("day"), num("hour") % 24, num("minute"), num("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Bir işletme gününün UTC sınırları [from, to) — ham event sorgularında kullanılır. */
export function dayBoundsUtc(day: string, timezone: string): { from: Date; to: Date } {
  return { from: new Date(localMidnightUtc(day, timezone)), to: new Date(localMidnightUtc(shiftDay(day, 1), timezone)) };
}

/** Yerel gece yarısının UTC damgası. Yaz saati geçişlerinde offset değiştiği
 *  için iki adımda yakınsıyoruz (klasik iki geçişli çözüm). */
function localMidnightUtc(day: string, timezone: string): number {
  const guess = Date.parse(`${day}T00:00:00Z`);
  const firstOffset = zonedOffsetMs(new Date(guess), timezone);
  const candidate = guess - firstOffset;
  const secondOffset = zonedOffsetMs(new Date(candidate), timezone);
  return secondOffset === firstOffset ? candidate : guess - secondOffset;
}
