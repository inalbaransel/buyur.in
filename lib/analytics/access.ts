import PocketBase from "pocketbase";
import { PB_URL } from "@/lib/pocketbase";
import { getServicePB } from "@/lib/pocketbase-server";
import type { Business, BusinessMember, MemberRole, PlanLimits, PlanRecord } from "@/lib/types";

// Analytics API'nin yetki katmanı. İki kural pazarlıksız:
//   1) İşletme kimliği asla istemciden gelen değere güvenilerek kullanılmaz —
//      çağıranın token'ından türetilir ya da sahiplik/üyelik doğrulanır.
//   2) Plan yetkisi UI'da değil burada, sunucu tarafında kontrol edilir.

export type Permission =
  | "analytics.view"
  | "analytics.advanced"
  | "analytics.export"
  | "reports.view"
  | "reports.export"
  | "reports.schedule"
  | "team.manage";

/** Rol → izin haritası. Plan yetkisiyle kesişimi effectivePermissions üretir. */
const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    "analytics.view",
    "analytics.advanced",
    "analytics.export",
    "reports.view",
    "reports.export",
    "reports.schedule",
    "team.manage",
  ],
  admin: [
    "analytics.view",
    "analytics.advanced",
    "analytics.export",
    "reports.view",
    "reports.export",
    "reports.schedule",
    "team.manage",
  ],
  manager: ["analytics.view", "analytics.advanced", "reports.view"],
  staff: ["analytics.view"],
};

/** Plan limitlerinin hangi izni açtığı (docs/analytics-architecture.md §6). */
const PLAN_GATES: Partial<Record<Permission, keyof PlanLimits>> = {
  "analytics.view": "analytics",
  "analytics.advanced": "analytics_advanced",
  "analytics.export": "reports_export",
  "reports.view": "reports",
  "reports.export": "reports_export",
  "reports.schedule": "scheduled_reports",
};

export const DEFAULT_LIMITS: PlanLimits = {
  max_businesses: 1,
  max_menus: 1,
  max_products: 30,
  analytics: true,
  analytics_advanced: false,
  insights: false,
  reports: false,
  reports_export: false,
  scheduled_reports: false,
  analytics_retention_days: 30,
  custom_domain: false,
  branding_removal: false,
  campaigns: false,
  team_management: false,
  white_label: false,
  api_access: false,
};

export interface AnalyticsContext {
  userId: string;
  business: Business;
  plan: PlanRecord | null;
  limits: PlanLimits;
  role: MemberRole;
  permissions: Set<Permission>;
  /** Veri okumaları için servis istemcisi (sahiplik yukarıda doğrulandı). */
  service: PocketBase;
}

/** Çözülmüş bağlam önbelleği. Her analitik isteği kimlik + işletme + plan için
 *  4 ayrı PocketBase turu atıyordu (her tur ~250ms). Aynı token'la gelen
 *  isteklerde bunu bir kez yapıp kısa süre saklıyoruz.
 *
 *  Ödünleşim: iptal edilen bir token ya da değişen bir plan en fazla bu süre
 *  kadar geç yansır. Analitik okuma uçları için kabul edilebilir. */
const CONTEXT_TTL_MS = 60_000;
const contextCache = new Map<string, { context: AnalyticsContext; expiresAt: number }>();

function pruneContextCache(now: number): void {
  if (contextCache.size < 200) return;
  for (const [key, entry] of contextCache) {
    if (entry.expiresAt <= now) contextCache.delete(key);
  }
}

export class AccessError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
  }
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

/** Token'ı PocketBase'e doğrulatır; sahte/expired token burada elenir. */
async function authenticate(token: string): Promise<string> {
  if (!token) throw new AccessError(401, "unauthenticated");

  const pb = new PocketBase(PB_URL);
  pb.authStore.save(token, null);

  try {
    const auth = await pb.collection("menuva_users").authRefresh({ requestKey: null });
    const userId = auth.record?.id;
    if (!userId) throw new AccessError(401, "unauthenticated");
    return userId;
  } catch (err) {
    if (err instanceof AccessError) throw err;
    throw new AccessError(401, "unauthenticated");
  }
}

/** Kullanıcının erişebildiği işletmeyi bulur: önce sahiplik, sonra üyelik.
 *  `requestedId` verilmişse yalnızca doğrulamada kullanılır, sorguya girmez. */
async function resolveBusiness(service: PocketBase, userId: string, requestedId: string | null) {
  const owned = await service.collection("menuva_businesses").getFullList<Business>({
    filter: service.filter("owner = {:owner}", { owner: userId }),
    sort: "created",
    batch: 50,
    requestKey: null,
  });

  if (owned.length > 0) {
    if (!requestedId) return { business: owned[0]!, role: "owner" as MemberRole };
    const match = owned.find((business) => business.id === requestedId);
    if (match) return { business: match, role: "owner" as MemberRole };
  }

  const memberships = await service.collection("menuva_business_members").getFullList<BusinessMember>({
    filter: service.filter("user = {:user} && status = {:status}", { user: userId, status: "active" }),
    expand: "business",
    batch: 50,
    requestKey: null,
  });

  const usable = requestedId
    ? memberships.filter((member) => member.business === requestedId)
    : memberships;

  for (const member of usable) {
    const business = (member.expand as { business?: Business } | undefined)?.business;
    if (business) return { business, role: member.role };
  }

  throw new AccessError(requestedId ? 403 : 404, requestedId ? "forbidden" : "no_business");
}

function effectivePermissions(role: MemberRole, limits: PlanLimits): Set<Permission> {
  const granted = new Set<Permission>();
  for (const permission of ROLE_PERMISSIONS[role]) {
    const gate = PLAN_GATES[permission];
    if (gate && limits[gate] !== true) continue;
    granted.add(permission);
  }
  return granted;
}

/** Analytics uçlarının ortak giriş kapısı: kimlik → işletme → plan → izinler. */
export async function resolveAnalyticsContext(request: Request, requestedBusinessId?: string | null): Promise<AnalyticsContext> {
  const token = bearerToken(request);
  const cacheKey = `${token}\u0000${requestedBusinessId ?? ""}`;
  const now = Date.now();

  const cached = contextCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.context;

  const userId = await authenticate(token);
  const service = await getServicePB();

  const { business, role } = await resolveBusiness(service, userId, requestedBusinessId ?? null);

  let plan: PlanRecord | null = null;
  try {
    plan = await service
      .collection("menuva_plans")
      .getFirstListItem<PlanRecord>(service.filter("key = {:key}", { key: business.plan }), { requestKey: null });
  } catch {
    // Plan kaydı okunamazsa güvenli tarafta kalıp temel yetkilerle devam ediyoruz.
  }

  const limits: PlanLimits = { ...DEFAULT_LIMITS, ...(plan?.limits ?? {}) };

  const context: AnalyticsContext = {
    userId,
    business,
    plan,
    limits,
    role,
    permissions: effectivePermissions(role, limits),
    service,
  };

  pruneContextCache(now);
  contextCache.set(cacheKey, { context, expiresAt: now + CONTEXT_TTL_MS });
  return context;
}

/** Plan/rol değişikliğinden sonra bağlamı anında tazelemek için. */
export function clearAnalyticsContextCache(): void {
  contextCache.clear();
}

export function requirePermission(context: AnalyticsContext, permission: Permission): void {
  if (!context.permissions.has(permission)) {
    throw new AccessError(403, `permission_denied:${permission}`);
  }
}
