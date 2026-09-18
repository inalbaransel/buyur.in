import type { Plan } from "@/lib/types";

// İlan edilen fiyatlar `buyur_plans` koleksiyonundan okunur — kodda rakam YOK.
// Fiyat değişikliği admin panelinden yapılır; en geç bir dakika içinde landing,
// panel, yasal sayfalar ve yapılandırılmış veri (JSON-LD) aynı rakamı gösterir
// (bkz. lib/plan-catalog-loader.ts). Tohum değerler yalnızca yeni bir ortamı
// kurarken kullanılan scripts/plan-catalog.mjs içinde durur.
//
// Kayıt okunamamışsa ücretli planların fiyatı BİLİNMEZ (null): ekranlar rakam
// uydurmak yerine "fiyat için bize yazın" der. Ücretsiz plan tanım gereği 0₺.

export interface PlanPricing {
  /** Aylık ödemede aylık ücret. */
  monthly: number;
  /** Yıllık ödemede aylık eşdeğer ücret; yıllık toplam = 12 katı. */
  yearlyMonthly: number;
}

export const MONTHS_IN_YEAR = 12;

const FREE: PlanPricing = { monthly: 0, yearlyMonthly: 0 };

let livePricing: Partial<Record<Plan, PlanPricing>> = {};

export interface PlanPriceRecord {
  key?: string;
  price_monthly?: unknown;
  price_yearly_monthly?: unknown;
}

const isPrice = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** `buyur_plans` kayıtlarındaki fiyatları yükler. Geçersiz/eksik alanlı kayıt
 *  yok sayılır: yarım bir fiyat göstermektense hiç göstermemek daha güvenli. */
export function applyPlanPrices(records: PlanPriceRecord[]): void {
  const next: Partial<Record<Plan, PlanPricing>> = {};
  for (const record of records) {
    if (record.key !== "premium" && record.key !== "elite") continue;
    if (!isPrice(record.price_monthly) || !isPrice(record.price_yearly_monthly)) continue;
    next[record.key] = { monthly: record.price_monthly, yearlyMonthly: record.price_yearly_monthly };
  }
  livePricing = next;
}

export function resetPlanPrices(): void {
  livePricing = {};
}

/** Planın ilan fiyatı; ücretli plan için kayıt okunamadıysa null. */
export function planPricing(plan: Plan): PlanPricing | null {
  if (plan === "freemium") return FREE;
  return livePricing[plan] ?? null;
}

/** Yıllık ödemede tek seferde tahsil edilen tutar. */
export function yearlyTotal(pricing: PlanPricing): number {
  return pricing.yearlyMonthly * MONTHS_IN_YEAR;
}

/** Yıllık ödemenin aylığa göre indirim oranı (tam sayı yüzde). */
export function yearlyDiscountPercent(pricing: PlanPricing): number {
  if (pricing.monthly <= 0) return 0;
  return Math.round((1 - pricing.yearlyMonthly / pricing.monthly) * 100);
}

/** Kuruşu olan tutarlarda iki hane (199,20₺ · 2.390,40₺), tam sayılarda hiç
 *  (249₺): ilan edilen fiyat faturadaki tutarla birebir okunsun, ama ekranda
 *  gereksiz ",00" dolaşmasın.
 *
 *  Kayan nokta toleransı: 199,2 × 12 aritmetikte 2390.3999999999996 çıkıyor;
 *  bunu "tam sayı değil" diye değil, gerçekten kuruşlu olduğu için iki haneyle
 *  yazıyoruz — ama 200 × 12 gibi tam sonuçlar yuvarlama artığı yüzünden
 *  kuruşlu görünmesin diye kuruş kontrolünü yuvarlayarak yapıyoruz. */
export function formatTL(amount: number): string {
  const kurus = Math.round(amount * 100) % 100;
  const digits = kurus === 0 ? 0 : 2;
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)}₺`;
}
