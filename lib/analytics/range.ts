import { dayCount, dayKey, shiftDay } from "@/lib/analytics/time";

// Tarih aralığı çözümlemesi. Bütün aralıklar işletmenin saat dilimindeki gün
// anahtarlarıyla (YYYY-MM-DD) ifade edilir; uçlar dahildir.

export const RANGE_PRESETS = [
  "today",
  "yesterday",
  "last_7",
  "last_30",
  "last_90",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "custom",
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number];

export const COMPARE_MODES = ["previous_period", "previous_year", "none"] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

export interface DateRange {
  from: string;
  to: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Analitikte izin verilen en uzun aralık — daha uzunu agregat okumasını şişirir. */
export const MAX_RANGE_DAYS = 731;

export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function monthEnd(day: string): string {
  const [year, month] = day.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${day.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function addMonths(day: string, months: number): string {
  const [year, month] = day.split("-").map(Number) as [number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Preset ya da özel aralığı gün anahtarlarına çevirir. Geçersiz girdi son 30
 *  güne düşer — panelin boş kalmasındansa varsayılan aralık daha iyi. */
export function resolveRange(
  input: { preset?: string | null; from?: string | null; to?: string | null },
  timezone: string,
  now: Date = new Date()
): { range: DateRange; preset: RangePreset } {
  const today = dayKey(now, timezone);
  const preset = (RANGE_PRESETS as readonly string[]).includes(input.preset ?? "")
    ? (input.preset as RangePreset)
    : input.from && input.to
      ? "custom"
      : "last_30";

  switch (preset) {
    case "today":
      return { range: { from: today, to: today }, preset };
    case "yesterday": {
      const day = shiftDay(today, -1);
      return { range: { from: day, to: day }, preset };
    }
    case "last_7":
      return { range: { from: shiftDay(today, -6), to: today }, preset };
    case "last_90":
      return { range: { from: shiftDay(today, -89), to: today }, preset };
    case "this_month":
      return { range: { from: monthStart(today), to: today }, preset };
    case "last_month": {
      const start = addMonths(monthStart(today), -1);
      return { range: { from: start, to: monthEnd(start) }, preset };
    }
    case "this_year":
      return { range: { from: `${today.slice(0, 4)}-01-01`, to: today }, preset };
    case "last_year": {
      const year = Number(today.slice(0, 4)) - 1;
      return { range: { from: `${year}-01-01`, to: `${year}-12-31` }, preset };
    }
    case "custom": {
      if (isDayKey(input.from) && isDayKey(input.to) && input.from <= input.to) {
        const clamped = clampRange({ from: input.from, to: input.to }, today);
        return { range: clamped, preset };
      }
      return { range: { from: shiftDay(today, -29), to: today }, preset: "last_30" };
    }
    case "last_30":
    default:
      return { range: { from: shiftDay(today, -29), to: today }, preset: "last_30" };
  }
}

/** Aralığı bugüne ve üst sınıra göre kırpar (gelecek gün istenemez). */
function clampRange(range: DateRange, today: string): DateRange {
  const to = range.to > today ? today : range.to;
  const from = dayCount(range.from, to) > MAX_RANGE_DAYS ? shiftDay(to, -(MAX_RANGE_DAYS - 1)) : range.from;
  return { from, to };
}

/** Karşılaştırma aralığı: bir önceki eşit uzunluktaki dönem ya da geçen yılın
 *  aynı dönemi. "none" seçilirse karşılaştırma yapılmaz. */
export function comparisonRange(range: DateRange, mode: CompareMode): DateRange | null {
  if (mode === "none") return null;

  if (mode === "previous_year") {
    return { from: shiftYear(range.from), to: shiftYear(range.to) };
  }

  const length = dayCount(range.from, range.to);
  return { from: shiftDay(range.from, -length), to: shiftDay(range.from, -1) };
}

function shiftYear(day: string): string {
  const year = Number(day.slice(0, 4)) - 1;
  const rest = day.slice(4);
  // 29 Şubat → 28 Şubat (önceki yıl artık yıl olmayabilir).
  if (rest === "-02-29" && !isLeapYear(year)) return `${year}-02-28`;
  return `${year}${rest}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function normalizeCompareMode(value: unknown): CompareMode {
  return (COMPARE_MODES as readonly string[]).includes(String(value)) ? (value as CompareMode) : "previous_period";
}

/** Değişim yüzdesi. Önceki dönem 0 ise oran tanımsızdır (null döner) —
 *  "%100 artış" gibi yanıltıcı bir sayı üretmiyoruz. */
export function changeRatio(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}
