"use client";

import { useEffect, useRef, useState } from "react";

// Grafiklerin paylaştığı ölçüm/biçimlendirme yardımcıları.

/** Kapsayıcının genişliğini izler — SVG'yi viewBox ile esnetmek yerine gerçek
 *  piksel genişliğinde çiziyoruz, böylece yazılar hiçbir ölçekte deforme olmuyor. */
export function useChartWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setWidth(Math.max(220, element.clientWidth));
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

const compactFormatter = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });
const plainFormatter = new Intl.NumberFormat("tr-TR");

/** 1.284 · 12,8 B — stat kartları ve eksen etiketleri için. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10_000 ? compactFormatter.format(value) : plainFormatter.format(Math.round(value));
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? plainFormatter.format(Math.round(value)) : "—";
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `%${(value * 100).toFixed(digits).replace(".", ",")}`;
}

/** Değişim oranı: işaretli ve yüzde. Önceki dönem 0 ise oran tanımsızdır. */
export function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return `${sign} %${Math.abs(value * 100).toFixed(1).replace(".", ",")}`;
}

/** Saniyeyi "2dk 14sn" gibi okunur süreye çevirir. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0sn";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest}sn`;
  if (minutes < 60) return rest === 0 ? `${minutes}dk` : `${minutes}dk ${rest}sn`;
  const hours = Math.floor(minutes / 60);
  return `${hours}sa ${minutes % 60}dk`;
}

const dayFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
const fullDayFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export function formatDayShort(day: string): string {
  return dayFormatter.format(new Date(`${day}T00:00:00`));
}

export function formatDayLong(day: string): string {
  return fullDayFormatter.format(new Date(`${day}T00:00:00`));
}

/** ISO tarihi (2026-08-17) TR kısa biçime çevirir: 17.08.26. Filtre/aralık
 *  etiketleri için — ham ISO'yu ekranda hiçbir yerde göstermiyoruz. */
export function formatDateShort(day: string): string {
  return shortDateFormatter.format(new Date(`${day}T00:00:00`));
}

/** İki ISO tarihi "17.07.26 → 16.08.26" biçiminde birleştirir. */
export function formatDateRange(from: string, to: string): string {
  return `${formatDateShort(from)} → ${formatDateShort(to)}`;
}

export const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Ekseni yuvarlak sayılara böler (0 / 500 / 1.000 gibi). */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(value);
  return ticks;
}

/** Düz çizgi yolu (SVG path "d"). */
export function linePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}
