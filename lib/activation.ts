import { pb } from "@/lib/pocketbase";
import { trackMarketingEvent } from "@/lib/marketing-events";
import type { Business, BusinessActivation } from "@/lib/types";

// Aktivasyon işaretleri: işletmenin "menüm yayında" noktasına ne zaman vardığı.
// Aktivasyon metriği = ilk QR indirme + ilk gerçek menü görüntülemesi
// (menu_views yalnızca bot olmayan müşteri görüntülemelerini sayar).
//
// Kalıcı kopya işletme kaydının `activation` alanında (bkz. setup-pocketbase.mjs);
// alan henüz kurulmamış bir ortamda yerel kopya ile çalışmaya devam eder.

type Step = "qr_downloaded_at" | "checklist_completed_at";

const EVENT_NAMES: Record<Step, string> = {
  qr_downloaded_at: "activation_qr_download",
  checklist_completed_at: "activation_checklist_complete",
};

function localKey(businessId: string): string {
  return `buyur-activation-${businessId}`;
}

function readLocal(businessId: string): BusinessActivation {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(localKey(businessId)) ?? "{}") as BusinessActivation;
  } catch {
    return {};
  }
}

export function readActivation(business: Business): BusinessActivation {
  return { ...readLocal(business.id), ...(business.activation ?? {}) };
}

/** Bir adımı ilk kez işaretler (tekrar çağrılırsa bir şey yapmaz). Güncellenen
 *  işletme kaydını döner; kaydedilemediyse null. */
export async function markActivation(
  business: Business,
  step: Step,
  extra: Partial<BusinessActivation> = {}
): Promise<Business | null> {
  const current = readActivation(business);
  if (current[step]) return null;

  const next: BusinessActivation = { ...current, ...extra, [step]: new Date().toISOString() };
  try {
    window.localStorage.setItem(localKey(business.id), JSON.stringify(next));
  } catch {
    /* yoksay */
  }
  trackMarketingEvent(EVENT_NAMES[step], { plan: business.plan });

  return saveActivation(business, next);
}

/** Aktivasyon nesnesini işletme kaydına yazar (sektör seçimi gibi ek bilgiler için de). */
export async function saveActivation(business: Business, activation: BusinessActivation): Promise<Business | null> {
  try {
    return await pb.collection("buyur_businesses").update<Business>(business.id, { activation });
  } catch {
    return null;
  }
}
