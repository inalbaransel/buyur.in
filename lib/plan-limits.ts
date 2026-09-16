import { pb } from "@/lib/pocketbase";
import type { Plan, PlanLimits, PlanRecord } from "@/lib/types";

// Plan koleksiyonuna erişilemezse (ağ hatası, henüz seed edilmemiş dev ortamı vb.)
// kısıtlamaları kilitli göstermek yerine sınırsız kabul ediyoruz — geçici bir
// altyapı sorunu yüzünden ödeme yapan bir işletmeyi paneli kullanamaz hale
// getirmeyelim. Bkz. scripts/migrate-plans.mjs ve onboarding'deki benzer karar.
const UNRESTRICTED_LIMITS: PlanLimits = {
  max_businesses: null,
  max_menus: null,
  max_products: null,
  analytics: true,
  custom_domain: true,
  branding_removal: true,
  campaigns: true,
  white_label: true,
  api_access: true,
};

/** Plan kaydının tamamı (limitler + deneme süresi). Bulunamazsa null. */
export async function fetchPlan(planKey: Plan): Promise<PlanRecord | null> {
  try {
    return await pb
      .collection("buyur_plans")
      .getFirstListItem<PlanRecord>(pb.filter("key = {:key}", { key: planKey }), { requestKey: null });
  } catch {
    return null;
  }
}

/** İşletmenin planına ait koşul/kısıtlama setini `buyur_plans` koleksiyonundan getirir. */
export async function fetchPlanLimits(planKey: Plan): Promise<PlanLimits> {
  try {
    const record = await pb
      .collection("buyur_plans")
      .getFirstListItem<PlanRecord>(pb.filter("key = {:key}", { key: planKey }), { requestKey: null });
    return record.limits;
  } catch {
    return UNRESTRICTED_LIMITS;
  }
}
