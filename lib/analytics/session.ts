// Oturum / ziyaretçi kimliği kuralları. Kimlikler rastgeledir: IP, User-Agent
// ya da başka bir parmak izinden türetilmez — kişiye bağlanamaz (bkz. §9).

export const SESSION_COOKIE = "mv_sid";
export const VISITOR_COOKIE = "mv_vid";

/** Hareketsizlik eşiği: bu süre boyunca event gelmezse oturum kapanmış sayılır. */
export const SESSION_TIMEOUT_MINUTES = 30;
export const VISITOR_TTL_DAYS = 365;

export function newAnalyticsId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "");
}

/** Cookie'den gelen kimliğin bizim ürettiğimiz biçimde olduğunu doğrular —
 *  elle uydurulmuş uzun/garip değerler veritabanına girmesin. */
export function isValidAnalyticsId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32}$/.test(value);
}
