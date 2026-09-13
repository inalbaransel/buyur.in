// Landing'de "Premium'u başlat" deyip kayda gelen işletmenin niyeti. Ödeme
// akışı panelde tamamlanır (Plan sayfası); o ana kadar niyet tarayıcıda tutulur.

export type IntentPlan = "premium" | "elite";
export type IntentBilling = "monthly" | "yearly";

export interface PlanIntent {
  plan: IntentPlan;
  billing: IntentBilling;
  at: string;
}

const KEY = "menuva-plan-intent";

export function parsePlanIntent(search: string): { plan: IntentPlan; billing: IntentBilling } | null {
  const params = new URLSearchParams(search);
  const plan = params.get("plan");
  if (plan !== "premium" && plan !== "elite") return null;
  return { plan, billing: params.get("billing") === "monthly" ? "monthly" : "yearly" };
}

export function savePlanIntent(plan: IntentPlan, billing: IntentBilling): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ plan, billing, at: new Date().toISOString() }));
  } catch {
    /* yoksay */
  }
}

export function readPlanIntent(): PlanIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as PlanIntent | null;
    return value && (value.plan === "premium" || value.plan === "elite") ? value : null;
  } catch {
    return null;
  }
}

export function clearPlanIntent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* yoksay */
  }
}
