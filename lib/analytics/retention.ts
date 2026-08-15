import type PocketBase from "pocketbase";
import { businessTimezone, dayKey } from "@/lib/analytics/time";
import { STATS_COLLECTION } from "@/lib/analytics/rollup";
import type { Business, PlanRecord } from "@/lib/types";

// Ham event saklama süresi. Agregatlar (menuva_stats_daily) hiç silinmez:
// plan düşse bile geçmiş kaybolmasın, tekrar yükseltmede geri gelsin (§6).
// Silinen yalnızca ham event akışı — agregatlar zaten hesaplanmış olur.

/** Plan retention'ına eklenen güvenlik payı: gün sınırında hesaplanmamış
 *  event'ler silinmesin diye. */
const GRACE_DAYS = 7;

const DEFAULT_RETENTION_DAYS = 30;

/** Bir seferde silinecek üst sınır — uzun süre çalışan işlerden kaçınıyoruz. */
const MAX_DELETES_PER_RUN = 2000;

export function retentionDaysFor(plan: PlanRecord | null): number {
  return plan?.limits?.analytics_retention_days ?? DEFAULT_RETENTION_DAYS;
}

/** Saklama süresi dolmuş ham event'leri siler; silinen kayıt sayısını döner.
 *
 *  Değişmez kural: **agregata dönüşmemiş bir gün silinmez.** Ham event'i
 *  aggregate etmeden silmek veriyi geri dönüşsüz kaybettirir (ilk kurulumda
 *  tam olarak bu oldu). Bu yüzden yalnızca `menuva_stats_daily` içinde o güne
 *  ait `total` satırı bulunan event'ler temizleniyor. */
export async function pruneEvents(pb: PocketBase, business: Business, retentionDays: number): Promise<number> {
  const timezone = businessTimezone(business);
  const cutoff = new Date(Date.now() - (retentionDays + GRACE_DAYS) * 86_400_000);
  const cutoffDay = dayKey(cutoff, timezone);

  // Hangi günler hesaplanmış? Yalnızca onlar silinebilir.
  const aggregated = await pb.collection(STATS_COLLECTION).getFullList<{ date: string }>({
    filter: pb.filter("business = {:business} && dimension = {:dimension} && date < {:day}", {
      business: business.id,
      dimension: "total",
      day: cutoffDay,
    }),
    fields: "date",
    batch: 500,
    requestKey: null,
  });

  const safeDays = new Set(aggregated.map((row) => row.date));
  if (safeDays.size === 0) return 0;

  const stale = await pb.collection("menuva_events").getList<{ id: string; occurred_at: string }>(
    1,
    MAX_DELETES_PER_RUN,
    {
      filter: pb.filter("business = {:business} && occurred_at < {:cutoff}", { business: business.id, cutoff }),
      fields: "id,occurred_at",
      requestKey: null,
    }
  );

  let deleted = 0;
  for (const record of stale.items) {
    if (!record.occurred_at) continue; // occurred_at'i olmayan eski kayıt: önce backfill edilmeli
    if (!safeDays.has(dayKey(new Date(record.occurred_at.replace(" ", "T")), timezone))) continue;
    await pb.collection("menuva_events").delete(record.id, { requestKey: null });
    deleted += 1;
  }

  return deleted;
}

/** Oturum kayıtları event'lerden daha küçük ve daha uzun süre işe yarıyor
 *  (dönen ziyaretçi tespiti); onları iki kat süre saklıyoruz. */
export async function pruneSessions(pb: PocketBase, business: Business, retentionDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - (retentionDays * 2 + GRACE_DAYS) * 86_400_000);

  const stale = await pb.collection("menuva_sessions").getList(1, MAX_DELETES_PER_RUN, {
    filter: pb.filter("business = {:business} && started_at < {:cutoff}", { business: business.id, cutoff }),
    fields: "id",
    requestKey: null,
  });

  for (const record of stale.items) {
    await pb.collection("menuva_sessions").delete(record.id, { requestKey: null });
  }

  return stale.items.length;
}
