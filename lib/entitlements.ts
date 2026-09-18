import type { Business, Plan } from "@/lib/types";

// Abonelik kurallarının TEK KAYNAĞI.
//
// Panel, genel menü, analytics API'si, rapor üretimi ve pazarlama sitesi —
// hepsi buradan okur. Plan kontrolü hiçbir yerde elle yazılmaz; böylece
// "landing'de yazan ile panelde uygulanan" ayrışamaz.
//
// Buyur'da tek ilişki geçerlidir: bir kullanıcı → bir işletme. Ekip/rol yok,
// dolayısıyla yetki yalnızca plana bağlıdır.

export const PLAN_ORDER: Plan[] = ["freemium", "premium", "elite"];

export const PLAN_LABELS: Record<Plan, string> = {
  freemium: "Freemium",
  premium: "Premium",
  elite: "Elite",
};

/** Kilitlenebilir yetenekler. Yeni özellik eklenince tek yer burası. */
export type Feature =
  | "menu"
  | "basic_analytics"
  | "advanced_analytics"
  | "insights"
  | "campaigns"
  | "custom_domain"
  | "branding_removal"
  | "custom_website"
  | "advanced_website"
  | "gifted_website"
  | "advanced_reports"
  | "report_export"
  | "ai_menu_import"
  | "ai_translation";

export interface PlanEntitlements {
  features: Record<Feature, boolean>;
  /** Freemium'a özgü kullanım limitleri; ücretli planlarda null (sınırsız). */
  limits: {
    /** Süre limiti (ay). null = süresiz. */
    durationMonths: number | null;
    /** Menü görüntülenme limiti. null = sınırsız. */
    menuViews: number | null;
    /** Ham event saklama süresi (gün). */
    retentionDays: number;
    /** Ay başına AI menü tarama hakkı. null = sınırsız.
     *  Bir "tarama" = kullanıcının yüklediği sayfa kümesinin tek seferde
     *  modele gönderilmesi; sayfa sayısı değil istek sayısı sayılır. */
    aiScansPerMonth: number | null;
    /** Tek taramada gönderilebilecek en fazla sayfa (fotoğraf/PDF sayfası). */
    aiPagesPerScan: number;
  };
}

const NONE: Record<Feature, boolean> = {
  menu: false,
  basic_analytics: false,
  advanced_analytics: false,
  insights: false,
  campaigns: false,
  custom_domain: false,
  branding_removal: false,
  custom_website: false,
  advanced_website: false,
  gifted_website: false,
  advanced_reports: false,
  report_export: false,
  ai_menu_import: false,
  ai_translation: false,
};

/** ÖZELLİK MATRİSİ — ürün kararının tek yazılı hâli. */
export const PLAN_ENTITLEMENTS: Record<Plan, PlanEntitlements> = {
  freemium: {
    features: { ...NONE, menu: true, basic_analytics: true, ai_menu_import: true, ai_translation: true },
    limits: { durationMonths: 3, menuViews: 10_000, retentionDays: 90, aiScansPerMonth: 3, aiPagesPerScan: 5 },
  },
  premium: {
    features: {
      ...NONE,
      menu: true,
      basic_analytics: true,
      advanced_analytics: true,
      insights: true,
      campaigns: true,
      custom_domain: true,
      branding_removal: true,
      custom_website: true,
      ai_menu_import: true,
      ai_translation: true,
    },
    // Ücretli planlarda Freemium limitleri UYGULANMAZ.
    limits: { durationMonths: null, menuViews: null, retentionDays: 365, aiScansPerMonth: 30, aiPagesPerScan: 10 },
  },
  elite: {
    features: {
      ...NONE,
      menu: true,
      basic_analytics: true,
      advanced_analytics: true,
      insights: true,
      campaigns: true,
      custom_domain: true,
      branding_removal: true,
      custom_website: true,
      advanced_website: true,
      gifted_website: true,
      advanced_reports: true,
      report_export: true,
      ai_menu_import: true,
      ai_translation: true,
    },
    limits: { durationMonths: null, menuViews: null, retentionDays: 1095, aiScansPerMonth: null, aiPagesPerScan: 20 },
  },
};

export function normalizePlan(value: unknown): Plan {
  return PLAN_ORDER.includes(value as Plan) ? (value as Plan) : "freemium";
}

export function entitlementsFor(plan: Plan): PlanEntitlements {
  return PLAN_ENTITLEMENTS[normalizePlan(plan)];
}

// ─── Freemium kullanımı ────────────────────────────────────────────────

export type FreemiumLimitReason = "duration" | "menu_views";

export interface FreemiumUsage {
  /** Bu plan süre/görüntülenme limitine tabi mi (yalnızca Freemium). */
  limited: boolean;
  /** Kalan gün; süresiz planda null. */
  daysLeft: number | null;
  expiresAt: Date | null;
  menuViews: number;
  menuViewLimit: number | null;
  /** 0–1 arası; iki limitten hangisi daha doluysa o. */
  usageRatio: number;
  /** Limit doldu mu ve hangisi yüzünden. */
  exhausted: boolean;
  reason: FreemiumLimitReason | null;
  /** Uyarı eşiği: 50 / 75 / 90 / 100 ya da null. */
  warningThreshold: 50 | 75 | 90 | 100 | null;
}

export const FREEMIUM_WARNING_THRESHOLDS = [50, 75, 90, 100] as const;

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value.trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** İşletmenin Freemium kullanım durumu. Ücretli planlarda `limited: false`
 *  döner ve hiçbir limit uygulanmaz — bu ayrım kritik. */
export function freemiumUsage(
  business: Pick<Business, "plan" | "plan_expires_at" | "menu_views">,
  now: Date = new Date()
): FreemiumUsage {
  const plan = normalizePlan(business.plan);
  const { limits } = entitlementsFor(plan);

  const menuViews = Math.max(0, business.menu_views ?? 0);

  if (limits.durationMonths === null && limits.menuViews === null) {
    return {
      limited: false,
      daysLeft: null,
      expiresAt: null,
      menuViews,
      menuViewLimit: null,
      usageRatio: 0,
      exhausted: false,
      reason: null,
      warningThreshold: null,
    };
  }

  const expiresAt = parseDate(business.plan_expires_at);
  const msLeft = expiresAt ? expiresAt.getTime() - now.getTime() : null;
  const daysLeft = msLeft === null ? null : Math.max(0, Math.ceil(msLeft / 86_400_000));

  const viewRatio = limits.menuViews ? menuViews / limits.menuViews : 0;
  // Süre oranı: toplam süreye göre ne kadarı geçti.
  const totalMs = limits.durationMonths ? limits.durationMonths * 30 * 86_400_000 : null;
  const timeRatio = totalMs && msLeft !== null ? 1 - Math.max(0, msLeft) / totalMs : 0;

  const usageRatio = Math.min(1, Math.max(0, Math.max(viewRatio, timeRatio)));

  const viewsExhausted = limits.menuViews !== null && menuViews >= limits.menuViews;
  const timeExhausted = msLeft !== null && msLeft <= 0;

  // Hangisi önce dolduysa Freemium biter.
  const reason: FreemiumLimitReason | null = viewsExhausted
    ? "menu_views"
    : timeExhausted
      ? "duration"
      : null;

  let warningThreshold: FreemiumUsage["warningThreshold"] = null;
  const percent = usageRatio * 100;
  for (const threshold of FREEMIUM_WARNING_THRESHOLDS) {
    if (percent >= threshold) warningThreshold = threshold;
  }

  return {
    limited: true,
    daysLeft,
    expiresAt,
    menuViews,
    menuViewLimit: limits.menuViews,
    usageRatio,
    exhausted: viewsExhausted || timeExhausted,
    reason,
    warningThreshold,
  };
}

// ─── AI kullanım kotası ────────────────────────────────────────────────

/** Kotanın sayıldığı dönem anahtarı: işletmenin kaydındaki `ai_scans_period`
 *  ile karşılaştırılır; ay değişince sayaç sıfırdan başlar. */
export function aiPeriodKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface AiUsage {
  /** Bu plan tarama sayısına tabi mi (Elite'te sınırsız). */
  limited: boolean;
  /** Bu dönem kullanılan tarama sayısı. */
  used: number;
  /** Dönem başına hak; sınırsızsa null. */
  limit: number | null;
  /** Kalan hak; sınırsızsa null. */
  remaining: number | null;
  /** Hak bitti mi. */
  exhausted: boolean;
  /** Tek taramada gönderilebilecek en fazla sayfa. */
  pagesPerScan: number;
  /** Sayacın ait olduğu dönem (YYYY-MM). */
  period: string;
}

/** İşletmenin bu ayki AI tarama kullanımı. Kayıttaki dönem geçmiş bir aya
 *  aitse sayaç sıfır kabul edilir — dönem sıfırlaması için ayrı bir cron'a
 *  gerek kalmasın diye okuma anında hesaplanıyor. */
export function aiUsage(
  business: Pick<Business, "plan"> & { ai_scans_used?: number; ai_scans_period?: string },
  now: Date = new Date()
): AiUsage {
  const plan = normalizePlan(business.plan);
  const { limits } = entitlementsFor(plan);
  const period = aiPeriodKey(now);

  const samePeriod = business.ai_scans_period === period;
  const used = samePeriod ? Math.max(0, business.ai_scans_used ?? 0) : 0;
  const limit = limits.aiScansPerMonth;

  return {
    limited: limit !== null,
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    exhausted: limit !== null && used >= limit,
    pagesPerScan: limits.aiPagesPerScan,
    period,
  };
}

/** Abonelik hâlâ geçerli mi (Freemium'da limit dolmamış, ücretli planda her zaman). */
export function isSubscriptionActive(
  business: Pick<Business, "plan" | "plan_expires_at" | "menu_views">,
  now: Date = new Date()
): boolean {
  return !freemiumUsage(business, now).exhausted;
}

/** Bir özellik bu işletme için kullanılabilir mi.
 *  Freemium limiti dolduğunda temel menü dışındaki yetenekler kapanır; veri
 *  silinmez, yalnızca erişim kısıtlanır. */
export function isFeatureAvailable(
  business: Pick<Business, "plan" | "plan_expires_at" | "menu_views">,
  feature: Feature,
  now: Date = new Date()
): boolean {
  const plan = normalizePlan(business.plan);
  const allowed = entitlementsFor(plan).features[feature];
  if (!allowed) return false;

  // Freemium süresi/limitleri dolduysa menü dışındaki özellikler kilitlenir.
  if (feature !== "menu" && !isSubscriptionActive(business, now)) return false;
  return true;
}

/** Bir özelliğin açık olduğu en düşük plan — "hangi plana geçmeliyim" mesajı için. */
export function requiredPlanFor(feature: Feature): Plan | null {
  return PLAN_ORDER.find((plan) => PLAN_ENTITLEMENTS[plan].features[feature]) ?? null;
}

// ─── Pazarlama ve panel için ortak karşılaştırma tablosu ───────────────

export interface FeatureMatrixRow {
  label: string;
  /** Plana göre gösterilecek değer: true/false ya da serbest metin. */
  values: Record<Plan, boolean | string>;
}

/** Landing sayfası ve panelin plan sayfası aynı tablodan beslenir. */
export const FEATURE_MATRIX: FeatureMatrixRow[] = [
  { label: "Dijital QR menü", values: { freemium: true, premium: true, elite: true } },
  {
    label: "Menü görüntülenme",
    values: { freemium: "10.000", premium: "Sınırsız", elite: "Sınırsız" },
  },
  {
    label: "Kullanım süresi",
    values: { freemium: "3 ay", premium: "Sınırsız", elite: "Sınırsız" },
  },
  { label: "Temel analizler", values: { freemium: true, premium: true, elite: true } },
  { label: "Gelişmiş analizler", values: { freemium: false, premium: true, elite: true } },
  { label: "Otomatik içgörüler & performans skoru", values: { freemium: false, premium: true, elite: true } },
  { label: "Kampanyalar", values: { freemium: false, premium: true, elite: true } },
  { label: "buyur markasını kaldırma", values: { freemium: false, premium: true, elite: true } },
  { label: "Özel alan adı", values: { freemium: false, premium: true, elite: true } },
  {
    label: "Standart web sitesi (menü verisinden otomatik)",
    values: { freemium: false, premium: true, elite: true },
  },
  {
    label: "Gelişmiş web sitesi deneyimi (animasyon · slider · galeri)",
    values: { freemium: false, premium: false, elite: true },
  },
  {
    label: "Hediye kurumsal web sitesi (bizim kurduğumuz ayrı site)",
    values: { freemium: false, premium: false, elite: "Hediye" },
  },
  {
    label: "Yapay zekâ ile fiziksel menü aktarımı",
    values: { freemium: "Ayda 3 tarama", premium: "Ayda 30 tarama", elite: "Sınırsız" },
  },
  {
    label: "Yapay zekâ ile çoklu dil tamamlama",
    values: { freemium: true, premium: true, elite: true },
  },
  { label: "Gelişmiş raporlar", values: { freemium: false, premium: false, elite: true } },
  { label: "PDF ve CSV dışa aktarma", values: { freemium: false, premium: false, elite: true } },
];
