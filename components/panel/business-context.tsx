"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/lib/use-auth";
import { ensurePlanCatalog } from "@/lib/plan-catalog-loader";
import type { Business } from "@/lib/types";

interface BusinessContextValue {
  business: Business | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setBusiness: (b: Business) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [business, setBusinessState] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBusinessState(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      // Tek ilişki: bir kullanıcı → bir işletme. Ekip/üyelik kavramı yok.
      // Plan kuralları canlı `buyur_plans` kaydından gelir; işletmeyle paralel
      // okunur ki panelin açılışına ek tur binmesin.
      const [record] = await Promise.all([
        pb
          .collection("buyur_businesses")
          .getFirstListItem<Business>(pb.filter("owner = {:id}", { id: user.id }), { requestKey: null }),
        ensurePlanCatalog(pb),
      ]);
      setBusinessState(record);
    } catch (err) {
      // StrictMode'un dev'de effect'i iki kez çalıştırması SDK'nın bu isteği
      // otomatik iptal etmesine yol açabilir — bu durumda "işletme yok"
      // sanıp onboarding ekranını yanlışlıkla göstermeyelim.
      const isCancelled = err instanceof ClientResponseError && err.isAbort;
      if (isCancelled) return;
      setBusinessState(null);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return (
    <BusinessContext.Provider
      value={{
        business,
        isLoading: authLoading || isLoading,
        refresh,
        setBusiness: setBusinessState,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness, BusinessProvider içinde kullanılmalı.");
  return ctx;
}
