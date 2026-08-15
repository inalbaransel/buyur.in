// Basit faz zamanlayıcı. Analytics uçlarının nerede zaman harcadığını hem
// sunucu logunda hem de `Server-Timing` başlığında görebilmek için — "yavaş"
// şikâyetini tahminle değil ölçümle karşılamak lazım.

export interface PhaseTimer {
  /** Bir fazı ölçer ve sonucu döndürür. */
  measure<T>(name: string, run: () => Promise<T>): Promise<T>;
  /** Ölçülen fazları `Server-Timing` başlığı biçiminde verir. */
  header(): string;
  /** Loglanabilir özet: "auth=120ms stats=430ms". */
  summary(): string;
  totalMs(): number;
}

export function createTimer(): PhaseTimer {
  const phases: { name: string; ms: number }[] = [];
  const start = performance.now();

  return {
    async measure(name, run) {
      const began = performance.now();
      try {
        return await run();
      } finally {
        phases.push({ name, ms: performance.now() - began });
      }
    },
    header() {
      const parts = phases.map((phase) => `${phase.name};dur=${phase.ms.toFixed(1)}`);
      parts.push(`total;dur=${(performance.now() - start).toFixed(1)}`);
      return parts.join(", ");
    },
    summary() {
      const parts = phases.map((phase) => `${phase.name}=${Math.round(phase.ms)}ms`);
      parts.push(`toplam=${Math.round(performance.now() - start)}ms`);
      return parts.join(" ");
    },
    totalMs() {
      return performance.now() - start;
    },
  };
}
