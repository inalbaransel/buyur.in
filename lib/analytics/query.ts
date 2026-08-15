import type PocketBase from "pocketbase";
import { STATS_COLLECTION, ensureFreshStats } from "@/lib/analytics/rollup";
import { businessTimezone, dayBoundsUtc, dayRange } from "@/lib/analytics/time";
import type { DateRange } from "@/lib/analytics/range";
import type { Business, DailyStat, MenuSession, StatDimension } from "@/lib/types";

// Agregat okuma katmanı: panel sorguları ham event'e değil menuva_stats_daily'ye
// bakar. Buradaki fonksiyonlar saf şekillendirme yapar (IO yalnızca loadStats /
// rangeUniqueVisitors içinde).

/** Bir istek sırasında tembel olarak hesaplanacak en fazla gün sayısı.
 *  Geri kalan boşlukları cron (/api/analytics/rollup) kapatır — tek bir panel
 *  açılışı yüzlerce günü hesaplamaya kalkıp yavaşlamasın. */
const MAX_LAZY_ROLLUP_DAYS = 14;

/** Aralık tekil ziyaretçisini oturum kayıtlarından saymak için üst sınır.
 *  Aşılırsa günlük tekillerin toplamına düşer ve yanıt `approximate` işaretlenir. */
const UNIQUE_VISITOR_SESSION_CAP = 20_000;

/** Tazelik kontrolü de bir PocketBase turu. Aynı işletme/aralık için art arda
 *  gelen isteklerde (panelde sekme değiştirmek gibi) tekrar sorgulamıyoruz. */
const FRESHNESS_TTL_MS = 60_000;
const freshnessChecked = new Map<string, number>();

export interface DimensionEntry {
  key: string;
  label: string;
  metrics: Record<string, number>;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export async function loadStats(
  pb: PocketBase,
  business: Business,
  range: DateRange,
  dimensions?: StatDimension[]
): Promise<DailyStat[]> {
  const freshnessKey = `${business.id}\u0000${range.from}\u0000${range.to}`;
  const now = Date.now();
  const lastChecked = freshnessChecked.get(freshnessKey) ?? 0;

  if (now - lastChecked > FRESHNESS_TTL_MS) {
    freshnessChecked.set(freshnessKey, now);
    if (freshnessChecked.size > 500) {
      for (const [key, checkedAt] of freshnessChecked) {
        if (now - checkedAt > FRESHNESS_TTL_MS) freshnessChecked.delete(key);
      }
    }
    const days = dayRange(range.from, range.to);
    await ensureFreshStats(pb, business, days, new Date(), { limit: MAX_LAZY_ROLLUP_DAYS });
  }

  const filters = [pb.filter("business = {:business} && date >= {:from} && date <= {:to}", {
    business: business.id,
    from: range.from,
    to: range.to,
  })];

  if (dimensions && dimensions.length > 0) {
    const clause = dimensions.map((dimension) => pb.filter("dimension = {:dimension}", { dimension })).join(" || ");
    filters.push(`(${clause})`);
  }

  return pb.collection(STATS_COLLECTION).getFullList<DailyStat>({
    filter: filters.join(" && "),
    // Yalnızca gereken alanlar: yanıt gövdesi küçülür, tek turda daha çok satır sığar.
    fields: "date,dimension,key,label,metrics",
    batch: 500,
    sort: "date",
    requestKey: null,
  });
}

function addMetrics(target: Record<string, number>, source: Record<string, number>): void {
  for (const [metric, value] of Object.entries(source)) {
    if (typeof value === "number" && Number.isFinite(value)) target[metric] = (target[metric] ?? 0) + value;
  }
}

/** dimension = "total" satırlarının toplamı. */
export function totalMetrics(rows: DailyStat[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.dimension === "total") addMetrics(totals, row.metrics ?? {});
  }
  return totals;
}

/** Bir boyutu anahtar bazında toplar (ürün, kategori, kaynak…). */
export function groupDimension(rows: DailyStat[], dimension: StatDimension): DimensionEntry[] {
  const grouped = new Map<string, DimensionEntry>();

  for (const row of rows) {
    if (row.dimension !== dimension) continue;
    let entry = grouped.get(row.key);
    if (!entry) {
      entry = { key: row.key, label: row.label || row.key, metrics: {} };
      grouped.set(row.key, entry);
    }
    if (row.label && (!entry.label || entry.label === entry.key)) entry.label = row.label;
    addMetrics(entry.metrics, row.metrics ?? {});
  }

  return Array.from(grouped.values());
}

/** Gün gün zaman serisi. Veri olmayan günler 0 ile doldurulur — grafikte boşluk kalmasın. */
export function dailySeries(
  rows: DailyStat[],
  range: DateRange,
  metric: string,
  filter?: { dimension: StatDimension; key: string }
): SeriesPoint[] {
  const dimension = filter?.dimension ?? "total";
  const key = filter?.key ?? "";
  const byDate = new Map<string, number>();

  for (const row of rows) {
    if (row.dimension !== dimension || row.key !== key) continue;
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.metrics?.[metric] ?? 0));
  }

  return dayRange(range.from, range.to).map((date) => ({ date, value: byDate.get(date) ?? 0 }));
}

/** Saat kırılımı: dimension = "hour", key = metrik ailesi (sessions/page_views/engagement). */
export function hourlyTotals(rows: DailyStat[], key: string): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const row of rows) {
    if (row.dimension !== "hour" || row.key !== key) continue;
    for (const [hour, value] of Object.entries(row.metrics ?? {})) {
      const index = Number.parseInt(hour, 10);
      if (Number.isInteger(index) && index >= 0 && index < 24) hours[index] += value;
    }
  }
  return hours;
}

/** Gün × saat ısı haritası. Haftanın günü tarih anahtarından türetilir
 *  (0 = Pazartesi), böylece ayrıca bir "weekday" boyutu saklamıyoruz. */
export function weekdayHourMatrix(rows: DailyStat[], key: string): number[][] {
  const matrix = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));

  for (const row of rows) {
    if (row.dimension !== "hour" || row.key !== key) continue;
    const weekday = weekdayOfDayKey(row.date);
    for (const [hour, value] of Object.entries(row.metrics ?? {})) {
      const index = Number.parseInt(hour, 10);
      if (Number.isInteger(index) && index >= 0 && index < 24) matrix[weekday]![index]! += value;
    }
  }

  return matrix;
}

/** 0 = Pazartesi … 6 = Pazar. */
export function weekdayOfDayKey(day: string): number {
  const utcDay = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Pazar
  return (utcDay + 6) % 7;
}

export interface OverviewTotals {
  sessions: number;
  visitors: number;
  page_views: number;
  qr_scans: number;
  category_views: number;
  product_views: number;
  product_detail_views: number;
  cart_adds: number;
  cart_removes: number;
  cart_views: number;
  searches: number;
  campaign_views: number;
  campaign_clicks: number;
  new_sessions: number;
  returning_sessions: number;
  bounced_sessions: number;
  duration_sum: number;
  /** Türetilmiş oranlar */
  avg_session_duration: number;
  pages_per_session: number;
  cart_conversion: number;
  detail_conversion: number;
  bounce_rate: number;
  returning_rate: number;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** Ham toplamları panelin beklediği metrik setine çevirir (türetilmiş oranlar dahil). */
export function deriveOverview(totals: Record<string, number>, visitors: number): OverviewTotals {
  const sessions = totals.sessions ?? 0;
  const pageViews = totals.page_views ?? 0;
  const productViews = totals.product_views ?? 0;
  const detailViews = totals.product_detail_views ?? 0;
  const cartAdds = totals.cart_adds ?? 0;
  const durationSum = totals.duration_sum ?? 0;

  return {
    sessions,
    visitors,
    page_views: pageViews,
    qr_scans: totals.qr_scans ?? 0,
    category_views: totals.category_views ?? 0,
    product_views: productViews,
    product_detail_views: detailViews,
    cart_adds: cartAdds,
    cart_removes: totals.cart_removes ?? 0,
    cart_views: totals.cart_views ?? 0,
    searches: totals.searches ?? 0,
    campaign_views: totals.campaign_views ?? 0,
    campaign_clicks: totals.campaign_clicks ?? 0,
    new_sessions: totals.new_sessions ?? 0,
    returning_sessions: totals.returning_sessions ?? 0,
    bounced_sessions: totals.bounced_sessions ?? 0,
    duration_sum: durationSum,
    avg_session_duration: ratio(durationSum, sessions),
    pages_per_session: ratio(pageViews, sessions),
    cart_conversion: ratio(cartAdds, sessions),
    detail_conversion: ratio(detailViews, productViews),
    bounce_rate: ratio(totals.bounced_sessions ?? 0, sessions),
    returning_rate: ratio(totals.returning_sessions ?? 0, sessions),
  };
}

export interface UniqueVisitorResult {
  /** Gerçek tekil sayım; hesaplanamadıysa null (çağıran günlük toplama düşer). */
  visitors: number | null;
  approximate: boolean;
}

/** Aralık boyunca tekil ziyaretçi. Günlük tekilleri toplamak çift sayardı;
 *  bu yüzden oturum kayıtlarından gerçek tekil sayımı yapıyoruz. Kayıt sayısı
 *  sınırı aşarsa (çok yoğun işletme / çok uzun aralık) günlük toplamına düşüp
 *  yanıtı "yaklaşık" olarak işaretliyoruz. */
export async function rangeUniqueVisitors(
  pb: PocketBase,
  business: Business,
  range: DateRange
): Promise<UniqueVisitorResult> {
  const timezone = businessTimezone(business);
  const from = dayBoundsUtc(range.from, timezone).from;
  const to = dayBoundsUtc(range.to, timezone).to;

  try {
    // Tek tur: ilk sayfa hem toplam sayıyı hem ilk 500 ziyaretçiyi getirir.
    // (Önceden ayrı bir sayım turu daha atılıyordu — her tur ~250ms.)
    const first = await pb.collection("menuva_sessions").getList<MenuSession>(1, 500, {
      filter: pb.filter("business = {:business} && started_at >= {:from} && started_at < {:to}", {
        business: business.id,
        from,
        to,
      }),
      fields: "visitor",
      requestKey: null,
    });

    if (first.totalItems > UNIQUE_VISITOR_SESSION_CAP) {
      return { visitors: null, approximate: true };
    }

    const unique = new Set(first.items.map((session) => session.visitor).filter(Boolean));

    // Kalan sayfalar (nadiren gerekir) paralel çekilir.
    if (first.totalItems > first.items.length) {
      const pages = Math.ceil(first.totalItems / 500);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) =>
          pb.collection("menuva_sessions").getList<MenuSession>(index + 2, 500, {
            filter: pb.filter("business = {:business} && started_at >= {:from} && started_at < {:to}", {
              business: business.id,
              from,
              to,
            }),
            fields: "visitor",
            requestKey: null,
          })
        )
      );
      for (const page of rest) {
        for (const session of page.items) if (session.visitor) unique.add(session.visitor);
      }
    }

    return { visitors: unique.size, approximate: false };
  } catch {
    return { visitors: null, approximate: true };
  }
}

/** İşletmenin ürün/kategori adları saniyelik değişmiyor; her analiz isteğinde
 *  yeniden çekmek gereksiz bir tur (~250ms). Menü boyutundaki bu listeyi kısa
 *  süre önbellekte tutuyoruz. */
const LABEL_TTL_MS = 5 * 60_000;
const labelCache = new Map<string, { value: Map<string, string>; expiresAt: number }>();

async function cachedBusinessMap(
  pb: PocketBase,
  cacheKey: string,
  load: () => Promise<Map<string, string>>
): Promise<Map<string, string>> {
  const now = Date.now();
  const cached = labelCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await load();
  labelCache.set(cacheKey, { value, expiresAt: now + LABEL_TTL_MS });
  return value;
}

/** İşletmenin bütün ürün adları (id → ad). */
export async function businessProductNames(pb: PocketBase, businessId: string): Promise<Map<string, string>> {
  return cachedBusinessMap(pb, `products-name\u0000${businessId}`, async () => {
    const records = await pb.collection("menuva_products").getFullList<{ id: string; name: string }>({
      filter: pb.filter("business = {:business}", { business: businessId }),
      fields: "id,name",
      batch: 500,
      requestKey: null,
    });
    return new Map(records.map((record) => [record.id, record.name]));
  });
}

/** İşletmenin ürün → kategori eşlemesi. */
export async function businessProductCategories(pb: PocketBase, businessId: string): Promise<Map<string, string>> {
  return cachedBusinessMap(pb, `products-category\u0000${businessId}`, async () => {
    const records = await pb.collection("menuva_products").getFullList<{ id: string; category: string }>({
      filter: pb.filter("business = {:business}", { business: businessId }),
      fields: "id,category",
      batch: 500,
      requestKey: null,
    });
    return new Map(records.map((record) => [record.id, record.category]));
  });
}

/** İşletmenin kategori adları (id → ad). */
export async function businessCategoryNames(pb: PocketBase, businessId: string): Promise<Map<string, string>> {
  return cachedBusinessMap(pb, `categories-name\u0000${businessId}`, async () => {
    const records = await pb.collection("menuva_categories").getFullList<{ id: string; name: string }>({
      filter: pb.filter("business = {:business}", { business: businessId }),
      fields: "id,name",
      batch: 500,
      requestKey: null,
    });
    return new Map(records.map((record) => [record.id, record.name]));
  });
}

/** Kayıt adlarını (ürün/kategori/kampanya/QR) agregat etiketleriyle tamamlar:
 *  etiketi boş kalmış ya da sonradan değişmiş kayıtlar için güncel adı getirir. */
export async function resolveLabels(
  pb: PocketBase,
  collection: string,
  ids: string[],
  field = "name"
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return labels;

  // Çok uzun filtreler oluşmasın diye parçalara bölüyoruz.
  const chunkSize = 50;
  for (let index = 0; index < unique.length; index += chunkSize) {
    const chunk = unique.slice(index, index + chunkSize);
    const clause = chunk.map((id) => pb.filter("id = {:id}", { id })).join(" || ");
    try {
      const records = await pb.collection(collection).getFullList<Record<string, string>>({
        filter: clause,
        fields: `id,${field}`,
        batch: chunkSize,
        requestKey: null,
      });
      for (const record of records) labels.set(record.id!, record[field] ?? "");
    } catch {
      // Etiket çözülemezse agregattaki etiket kullanılmaya devam eder.
    }
  }

  return labels;
}
