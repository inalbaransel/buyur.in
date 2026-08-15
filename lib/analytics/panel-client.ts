"use client";

import { pb } from "@/lib/pocketbase";

// Panelin analytics API istemcisi. İşletme kimliği gönderilmez — sunucu bunu
// token'dan türetir (bkz. lib/analytics/access.ts).

export interface AnalyticsMeta {
  range: { from: string; to: string; preset: string; timezone: string };
  comparison: { from: string; to: string; mode: string } | null;
  plan: { key: string; advanced: boolean; reports: boolean; export: boolean; insights: boolean };
  role: string;
  approximate: boolean;
  generatedAt: string;
}

export interface AnalyticsResponse<T> {
  data: T;
  meta: AnalyticsMeta;
}

export class AnalyticsError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code);
  }

  /** Plan yetersizliğinden kaynaklanan hata mı (yükseltme ekranı gösterilir). */
  get isPlanLocked(): boolean {
    return this.status === 403 && this.code.startsWith("permission_denied");
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

export async function fetchAnalytics<T>(
  endpoint: string,
  params: Record<string, string | undefined>,
  signal?: AbortSignal
): Promise<AnalyticsResponse<T>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  const response = await fetch(`/api/analytics/${endpoint}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${pb.authStore.token}` },
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new AnalyticsError(response.status, body?.error ?? "analytics_unavailable");
  }

  return (await response.json()) as AnalyticsResponse<T>;
}
