import type { Plan } from "@/lib/types";

// İlan edilen fiyatların TEK KAYNAĞI (₺, KDV hariç/dahil ayrımı için bkz.
// lib/legal.ts → Ödeme Koşulları).
//
// Canlı fiyat `buyur_plans` koleksiyonundan okunur; burası hem PocketBase'e
// ulaşılamadığında kullanılan yedek, hem de fiyatın metin içinde geçtiği
// yerlerin (yasal sayfalar, SSS) beslendiği yer. Rakam değişince önce burası,
// sonra scripts/migrate-plan-pricing.mjs ile canlı kayıtlar güncellenir.

export interface PlanPricing {
  /** Aylık ödemede aylık ücret. */
  monthly: number;
  /** Yıllık ödemede aylık eşdeğer ücret; yıllık toplam = 12 katı. */
  yearlyMonthly: number;
}

export const MONTHS_IN_YEAR = 12;

export const PLAN_PRICING: Record<Plan, PlanPricing> = {
  freemium: { monthly: 0, yearlyMonthly: 0 },
  premium: { monthly: 249, yearlyMonthly: 199.2 },
  elite: { monthly: 749, yearlyMonthly: 599.2 },
};

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
