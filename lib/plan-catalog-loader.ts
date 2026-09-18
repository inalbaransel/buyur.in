// `buyur_plans` kayıtlarını canlı katalog olarak yükler (bkz. applyPlanRecords).
//
// Plan kuralları admin panelinden değişir; kod bu kayıtları okur. Ama her
// menü açılışında ekstra bir PocketBase turu (~250ms) atmak "menü 2 saniyenin
// altında açılmalı" hedefine ters düşer. Bu yüzden kayıtlar süreç belleğinde
// kısa süre saklanır: kural değişince en geç TTL sonra her yere yansır.
//
// Hata sessizce yutulur: okunamazsa son bilinen katalog (ya da koddaki yedek)
// geçerli kalır — geçici bir ağ sorunu ödeme yapan işletmeyi kilitlemez
// (bkz. lib/plan-limits.ts).

import type PocketBase from "pocketbase";
import { applyPlanRecords, type PlanRecordLike } from "@/lib/entitlements";
import { applyPlanPrices, resetPlanPrices } from "@/lib/pricing";

/** Bir plan değişikliğinin en geç bu kadar sürede yansıması kabul edilir. */
export const PLAN_CATALOG_TTL_MS = 60_000;

let loadedAt = Number.NEGATIVE_INFINITY;
let loadedRecords: PlanRecordLike[] = [];
let inflight: Promise<void> | null = null;

export async function ensurePlanCatalog(client: Pick<PocketBase, "collection">, now: number = Date.now()): Promise<void> {
  if (now - loadedAt < PLAN_CATALOG_TTL_MS) return;
  // Aynı anda gelen istekler tek bir okumayı paylaşır.
  if (inflight) return inflight;

  inflight = client
    .collection("buyur_plans")
    .getFullList<PlanRecordLike>({ requestKey: null })
    .then((records) => {
      if (records.length > 0) {
        applyPlanRecords(records);
        applyPlanPrices(records);
        loadedRecords = records;
      }
      loadedAt = now;
    })
    .catch(() => {
      // Başarısızlıkta zaman damgası güncellenmez: bir sonraki istek yeniden dener.
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Son okunan ham plan kayıtları (ad, açıklama, özellik metinleri). Pazarlama
 *  kartları bunları sunucudan istemci bileşene prop olarak taşır. */
export function loadedPlanRecords(): PlanRecordLike[] {
  return loadedRecords;
}

/** Testler için: önbelleği sıfırlar. */
export function resetPlanCatalogCache(): void {
  loadedAt = Number.NEGATIVE_INFINITY;
  loadedRecords = [];
  inflight = null;
  resetPlanPrices();
}
