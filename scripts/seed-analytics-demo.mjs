// Demo analitik verisi üretir: gerçekçi oturum + event akışı, işletmenin
// GERÇEK kategori/ürün kayıtlarına bağlı. Amaç panelin dolu görünmesi (demo,
// ekran görüntüsü, satış sunumu).
//
// Üretilen her kayıt İŞARETLİDİR ve tek komutla geri alınabilir:
//   - oturum/ziyaretçi kimlikleri SEED_PREFIX ile başlar
//   - event'lerde meta.seed = true
//
// Kullanım:
//   POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... \
//     node scripts/seed-analytics-demo.mjs --slug=vezirhan --months=6
//   ... node scripts/seed-analytics-demo.mjs --slug=vezirhan --clean
//
// Not: demo veri gerçek veriyle aynı koleksiyonlarda yaşar; analiz ekranları
// ikisini birlikte gösterir. Gerçek ölçüm yapacaksan önce --clean çalıştır.

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  })
);

const SLUG = args.slug ?? "vezirhan";
const MONTHS = Number(args.months ?? 6);
const CLEAN = Boolean(args.clean);
/** Hiçbir şey yazmadan hacim/dağılım raporu verir. */
const DRY = Boolean(args.dry);

/** Demo kayıtlarının tanınma işareti (32 hex'lik kimliğin başında). */
const SEED_PREFIX = "5eed5eed";
const WRITE_CONCURRENCY = 12;

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

// ─── Deterministik rastgelelik (aynı komut aynı veriyi üretir) ───
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260815);

const pick = (list) => list[Math.floor(random() * list.length)];
const chance = (probability) => random() < probability;
const between = (min, max) => min + random() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = random() * total;
  for (const entry of entries) {
    threshold -= entry.weight;
    if (threshold <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

function seedId() {
  let rest = "";
  while (rest.length < 32 - SEED_PREFIX.length) rest += Math.floor(random() * 16).toString(16);
  return SEED_PREFIX + rest.slice(0, 32 - SEED_PREFIX.length);
}

// ─── Davranış modeli ───

/** Menü 12:00–23:00 açık; öğle ve akşam iki tepe yapıyor. */
const HOUR_WEIGHTS = [
  0.2, 0.1, 0.05, 0.02, 0.02, 0.02, 0.05, 0.15, 0.4, 0.7, 1.2, 2.4,
  6.5, 7.8, 5.2, 3.4, 3.0, 3.6, 5.4, 8.2, 8.8, 6.4, 3.2, 1.1,
];

/** 0 = Pazartesi. Hafta sonu belirgin şekilde yoğun. */
const WEEKDAY_MULTIPLIER = [0.78, 0.84, 0.92, 1.02, 1.35, 1.55, 1.25];

const SOURCES = [
  { value: "qr", weight: 52 },
  { value: "instagram", weight: 22 },
  { value: "google", weight: 11 },
  { value: "direct", weight: 8 },
  { value: "whatsapp", weight: 4 },
  { value: "facebook", weight: 2 },
  { value: "other", weight: 1 },
];

const DEVICES = [
  { value: "mobile", weight: 89 },
  { value: "desktop", weight: 6 },
  { value: "tablet", weight: 5 },
];

const CITIES = [
  { value: "İstanbul", weight: 72 },
  { value: "Ankara", weight: 8 },
  { value: "İzmir", weight: 6 },
  { value: "Bursa", weight: 4 },
  { value: "Antalya", weight: 4 },
  { value: "Kocaeli", weight: 3 },
  { value: "Muğla", weight: 3 },
];

const LOCALES = [
  { value: "tr", weight: 66 },
  { value: "en", weight: 22 },
  { value: "ar", weight: 7 },
  { value: "ru", weight: 5 },
];

const REFERRER_BY_SOURCE = {
  instagram: "instagram.com",
  google: "google.com",
  facebook: "facebook.com",
  whatsapp: "wa.me",
  other: "t.co",
};

/** Sonuçlu ve sonuçsuz arama terimleri — sonuçsuzlar "eksik ürün talebi"
 *  içgörüsünü tetikler. */
const SEARCH_TERMS = [
  { term: "burger", results: 9 },
  { term: "pizza", results: 5 },
  { term: "kahve", results: 6 },
  { term: "cheesecake", results: 2 },
  { term: "vegan", results: 1 },
  { term: "salata", results: 0 },
  { term: "kahvaltı", results: 0 },
  { term: "lahmacun", results: 0 },
  { term: "çorba", results: 1 },
  { term: "milkshake", results: 0 },
];

const PAGE_LABELS = {
  welcome: "Karşılama",
  menu: "Menü (kategoriler)",
  category: "Kategori sayfası",
  product: "Ürün sayfası",
  search: "Arama",
  cart: "Sepet",
};

// ─── Zaman yardımcıları (işletme saati Europe/Istanbul) ───
const TZ = "Europe/Istanbul";

function tzOffsetMs(date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const num = (type) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const asUtc = Date.UTC(num("year"), num("month") - 1, num("day"), num("hour") % 24, num("minute"), num("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Yerel gün + saat/dakikadan UTC damgası üretir. */
function localToUtc(day, hour, minute, second) {
  const guess = Date.parse(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`);
  const offset = tzOffsetMs(new Date(guess));
  return new Date(guess - offset);
}

function dayKeyUtc(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
}

function shiftDay(day, days) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(day) {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

// ─── Yazma havuzu ───
async function runPool(tasks, concurrency, onProgress) {
  let index = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (index < tasks.length) {
      const task = tasks[index++];
      await task();
      done += 1;
      if (onProgress && done % 250 === 0) onProgress(done, tasks.length);
    }
  });
  await Promise.all(workers);
}

// ─── Temizlik ───
async function cleanSeed(businessId) {
  const events = await pb.collection("buyur_events").getFullList({
    filter: pb.filter("business = {:b} && session ~ {:prefix}", { b: businessId, prefix: `${SEED_PREFIX}%` }),
    fields: "id",
    batch: 500,
  });
  const sessions = await pb.collection("buyur_sessions").getFullList({
    filter: pb.filter("business = {:b} && key ~ {:prefix}", { b: businessId, prefix: `${SEED_PREFIX}%` }),
    fields: "id",
    batch: 500,
  });

  console.log(`silinecek: ${events.length} event, ${sessions.length} oturum`);

  await runPool(
    events.map((record) => () => pb.collection("buyur_events").delete(record.id)),
    WRITE_CONCURRENCY,
    (done, total) => console.log(`  event ${done}/${total}`)
  );
  await runPool(
    sessions.map((record) => () => pb.collection("buyur_sessions").delete(record.id)),
    WRITE_CONCURRENCY
  );

  console.log("demo veri silindi. Agregatları tazelemek için rollup'ı çalıştırın.");
}

// ─── Üretim ───
async function main() {
  const business = await pb
    .collection("buyur_businesses")
    .getFirstListItem(pb.filter("slug = {:slug}", { slug: SLUG }));

  console.log(`işletme: ${business.name} (${business.id})`);

  if (CLEAN) {
    await cleanSeed(business.id);
    return;
  }

  const [categories, products, popups, qrCodes] = await Promise.all([
    pb.collection("buyur_categories").getFullList({
      filter: pb.filter("business = {:b} && is_active = true", { b: business.id }),
      sort: "order,created",
    }),
    pb.collection("buyur_products").getFullList({
      filter: pb.filter("business = {:b} && is_available = true", { b: business.id }),
      sort: "order,created",
    }),
    pb.collection("buyur_popups").getFullList({ filter: pb.filter("business = {:b}", { b: business.id }) }),
    pb.collection("buyur_qr_codes").getFullList({
      filter: pb.filter("business = {:b} && is_active = true", { b: business.id }),
    }),
  ]);

  if (categories.length === 0 || products.length === 0) {
    console.error("Bu işletmede aktif kategori/ürün yok — demo veri üretilemez.");
    process.exit(1);
  }

  console.log(`menü: ${categories.length} kategori, ${products.length} ürün, ${popups.length} kampanya, ${qrCodes.length} QR`);

  // Ürün profilleri: popülerlik ve dönüşüm kalitesi ayrı ayrı dağıtılır ki
  // fırsat analizi dört köşeyi de gösterebilsin (yıldız / gizli değer /
  // yüksek ilgi-düşük dönüşüm / zayıf).
  const productProfiles = products.map((product, index) => {
    const popularity = 1 / Math.pow(index + 1.6, 0.75); // zipf benzeri uzun kuyruk
    const quality = weightedPick([
      { value: "high", weight: index < 6 ? 34 : 18 },
      { value: "mid", weight: 46 },
      { value: "low", weight: index < 6 ? 20 : 36 },
    ]);
    return {
      product,
      popularity: popularity * between(0.7, 1.35),
      detailRate: quality === "high" ? between(0.42, 0.6) : quality === "mid" ? between(0.26, 0.4) : between(0.12, 0.24),
      cartRate: quality === "high" ? between(0.34, 0.52) : quality === "mid" ? between(0.16, 0.3) : between(0.04, 0.13),
    };
  });

  const productsByCategory = new Map();
  for (const profile of productProfiles) {
    const list = productsByCategory.get(profile.product.category) ?? [];
    list.push(profile);
    productsByCategory.set(profile.product.category, list);
  }

  const categoryWeights = categories.map((category, index) => ({
    value: category,
    weight: [30, 26, 22, 12, 7, 5][index] ?? 4,
  }));

  const today = dayKeyUtc(new Date());
  const totalDays = Math.round(MONTHS * 30.4);
  const startDay = shiftDay(today, -(totalDays - 1));

  const sessionRows = [];
  const eventRows = [];
  const visitorPool = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const day = shiftDay(startDay, dayIndex);
    const progress = dayIndex / Math.max(1, totalDays - 1);

    // Zamanla büyüyen trafik + hafta içi/sonu dalgalanması + rastgele gürültü.
    const base = 7 + progress * 17;
    const weekday = weekdayOf(day);
    const daily = Math.max(2, Math.round(base * WEEKDAY_MULTIPLIER[weekday] * between(0.75, 1.3)));

    for (let sessionIndex = 0; sessionIndex < daily; sessionIndex += 1) {
      const hour = weightedPick(HOUR_WEIGHTS.map((weight, index) => ({ value: index, weight })));
      const minute = intBetween(0, 59);
      const startedAt = localToUtc(day, hour, minute, intBetween(0, 59));

      const source = weightedPick(SOURCES);
      const device = weightedPick(DEVICES);
      const city = weightedPick(CITIES);
      const locale = weightedPick(LOCALES);

      // Dönen ziyaretçi: havuzdan bir kimlik yeniden kullanılır.
      const isReturning = visitorPool.length > 40 && chance(0.28);
      const visitor = isReturning ? pick(visitorPool) : seedId();
      if (!isReturning) visitorPool.push(visitor);
      if (visitorPool.length > 4000) visitorPool.shift();

      const sessionKey = seedId();
      const qr = source === "qr" && qrCodes.length > 0 ? pick(qrCodes) : null;

      const attribution = {
        source,
        medium: source === "qr" ? "qr" : source === "direct" ? "" : "referral",
        campaign: "",
        referrer_host: REFERRER_BY_SOURCE[source] ?? "",
        device,
        country: "TR",
        city,
        locale,
      };

      const events = [];
      let clock = startedAt.getTime();
      const step = (seconds) => {
        clock += Math.round(seconds * 1000);
        return new Date(clock).toISOString();
      };

      const addEvent = (type, extra = {}) => {
        events.push({
          business: business.id,
          type,
          session: sessionKey,
          visitor,
          ...attribution,
          qr: extra.qr ?? (qr ? qr.id : ""),
          product: extra.product ?? "",
          category: extra.category ?? "",
          popup: extra.popup ?? "",
          target: extra.target ?? "",
          label: extra.label ?? "",
          meta: { seed: true, ...(extra.meta ?? {}) },
          occurred_at: extra.occurred_at ?? new Date(clock).toISOString(),
        });
      };

      addEvent("session_start", { target: SLUG, label: "Oturum başladı" });
      if (source === "qr") {
        addEvent("qr_scan", { target: qr ? qr.code : "qr", label: qr ? qr.name : "QR tarama" });
      }

      let pageViews = 0;
      let productViews = 0;
      let cartAdds = 0;

      step(between(1.5, 5));
      addEvent("page_view", { target: "welcome", label: PAGE_LABELS.welcome });
      pageViews += 1;

      if (popups.length > 0 && chance(0.36)) {
        const popup = pick(popups);
        step(between(2, 6));
        addEvent("campaign_view", { popup: popup.id, target: popup.id, label: popup.title });
        if (chance(0.29)) {
          step(between(2, 7));
          addEvent("campaign_click", { popup: popup.id, target: popup.id, label: popup.title });
        }
      }

      if (locale !== "tr" && chance(0.35)) {
        step(between(2, 6));
        addEvent("language_change", { target: locale, label: `tr → ${locale}`, meta: { from: "tr", to: locale } });
      }

      // Menü açılmadan çıkanlar (bounce) bilinçli olarak modelde var.
      if (chance(0.12)) {
        finishSession();
        continue;
      }

      step(between(4, 14));
      addEvent("page_view", { target: "menu", label: PAGE_LABELS.menu });
      pageViews += 1;

      if (chance(0.09)) {
        const search = pick(SEARCH_TERMS);
        step(between(6, 18));
        addEvent("page_view", { target: "search", label: PAGE_LABELS.search });
        pageViews += 1;
        addEvent("search", {
          target: search.term,
          label: search.term,
          meta: { results: search.results, no_result: search.results === 0 },
        });
      }

      const categoryCount = weightedPick([
        { value: 1, weight: 42 },
        { value: 2, weight: 34 },
        { value: 3, weight: 18 },
        { value: 4, weight: 6 },
      ]);

      const visited = new Set();
      for (let i = 0; i < categoryCount; i += 1) {
        const category = weightedPick(categoryWeights);
        if (visited.has(category.id)) continue;
        visited.add(category.id);

        step(between(6, 20));
        addEvent("page_view", { target: "category", label: PAGE_LABELS.category });
        pageViews += 1;
        addEvent("category_view", { category: category.id, target: category.id, label: category.name });

        const pool = productsByCategory.get(category.id) ?? [];
        if (pool.length === 0) continue;

        // Listede görülen ürünler (oturum başına ürün başına bir kez).
        const impressionCount = Math.min(pool.length, intBetween(2, 5));
        const seen = new Set();
        for (let p = 0; p < impressionCount; p += 1) {
          const profile = weightedPick(pool.map((item) => ({ value: item, weight: item.popularity })));
          if (seen.has(profile.product.id)) continue;
          seen.add(profile.product.id);

          step(between(3, 11));
          addEvent("product_view", {
            product: profile.product.id,
            category: profile.product.category,
            target: profile.product.id,
            label: profile.product.name,
          });
          productViews += 1;

          if (!chance(profile.detailRate)) continue;

          step(between(5, 16));
          addEvent("page_view", { target: "product", label: PAGE_LABELS.product });
          pageViews += 1;
          addEvent("product_detail_view", {
            product: profile.product.id,
            category: profile.product.category,
            target: profile.product.id,
            label: profile.product.name,
          });

          if (!chance(profile.cartRate)) continue;

          step(between(2, 8));
          addEvent("add_to_cart", {
            product: profile.product.id,
            category: profile.product.category,
            target: profile.product.id,
            label: profile.product.name,
            meta: { quantity: chance(0.22) ? 2 : 1 },
          });
          cartAdds += 1;

          // Ara sıra fikir değiştirme.
          if (chance(0.08)) {
            step(between(6, 20));
            addEvent("remove_from_cart", {
              product: profile.product.id,
              category: profile.product.category,
              target: profile.product.id,
              label: profile.product.name,
            });
          }
        }
      }

      if (cartAdds > 0 && chance(0.63)) {
        step(between(6, 22));
        addEvent("page_view", { target: "cart", label: PAGE_LABELS.cart });
        pageViews += 1;
        addEvent("cart_view", { target: "cart", label: PAGE_LABELS.cart });
      }

      finishSession();

      function finishSession() {
        const lastSeen = new Date(clock);
        const duration = Math.max(5, Math.round((clock - startedAt.getTime()) / 1000));

        sessionRows.push({
          business: business.id,
          key: sessionKey,
          visitor,
          started_at: startedAt.toISOString(),
          last_seen_at: lastSeen.toISOString(),
          duration_sec: duration,
          events_count: events.length,
          page_views: pageViews,
          product_views: productViews,
          cart_adds: cartAdds,
          ...attribution,
          entry_path: "/",
          exit_path: cartAdds > 0 ? "/cart" : "/menu",
          qr: qr ? qr.id : "",
          is_returning: isReturning,
        });

        eventRows.push(...events);
      }
    }
  }

  console.log(`üretildi: ${sessionRows.length} oturum, ${eventRows.length} event (${totalDays} gün)`);

  if (DRY) {
    const byType = {};
    for (const row of eventRows) byType[row.type] = (byType[row.type] ?? 0) + 1;
    const bySource = {};
    for (const row of sessionRows) bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    const cartSessions = sessionRows.filter((row) => row.cart_adds > 0).length;
    const returning = sessionRows.filter((row) => row.is_returning).length;
    const avgDuration = sessionRows.reduce((sum, row) => sum + row.duration_sec, 0) / sessionRows.length;
    const uniqueVisitors = new Set(sessionRows.map((row) => row.visitor)).size;

    console.log("\nevent dağılımı:", JSON.stringify(byType, null, 2));
    console.log("kaynak dağılımı:", JSON.stringify(bySource));
    console.log(`tekil ziyaretçi: ${uniqueVisitors}`);
    console.log(`sepet dönüşümü: %${((cartSessions / sessionRows.length) * 100).toFixed(1)}`);
    console.log(`dönen ziyaretçi: %${((returning / sessionRows.length) * 100).toFixed(1)}`);
    console.log(`ortalama süre: ${Math.round(avgDuration)} sn`);
    console.log(`oturum başına event: ${(eventRows.length / sessionRows.length).toFixed(1)}`);
    console.log("\n(kuru çalıştırma — hiçbir kayıt yazılmadı)");
    return;
  }

  console.log("yazılıyor…");

  await runPool(
    sessionRows.map((row) => () => pb.collection("buyur_sessions").create(row, { requestKey: null })),
    WRITE_CONCURRENCY,
    (done, total) => console.log(`  oturum ${done}/${total}`)
  );

  await runPool(
    eventRows.map((row) => () => pb.collection("buyur_events").create(row, { requestKey: null })),
    WRITE_CONCURRENCY,
    (done, total) => console.log(`  event ${done}/${total}`)
  );

  console.log("\nDemo veri yazıldı.");
  console.log("Şimdi agregatları hesaplayın:");
  console.log(`  curl -H "x-analytics-secret: $ANALYTICS_CRON_SECRET" "http://localhost:3000/api/analytics/rollup?days=${totalDays + 2}"`);
}

main().catch((err) => {
  console.error("Hata:", err?.response ?? err);
  process.exit(1);
});
