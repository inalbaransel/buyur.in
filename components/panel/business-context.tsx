"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/lib/use-auth";
import type { Business, MemberRole } from "@/lib/types";

interface BusinessContextValue {
  business: Business | null;
  /** Kullanıcının bu işletmedeki rolü: sahibiyse "owner", değilse üyelik rolü. */
  role: MemberRole | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setBusiness: (b: Business) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [business, setBusinessState] = useState<Business | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setBusinessState(null);
      setRole(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const record = await pb
        .collection("menuva_businesses")
        .getFirstListItem<Business>(pb.filter("owner = {:id}", { id: user.id }), { requestKey: null });
      setBusinessState(record);
      setRole("owner");
      setIsLoading(false);
      return;
    } catch (err) {
      // StrictMode'un dev'de effect'i iki kez çalıştırması SDK'nın bu isteği
      // otomatik iptal etmesine yol açabilir — bu durumda "işletme yok"
      // sanıp onboarding ekranını yanlışlıkla göstermeyelim.
      const isCancelled = err instanceof ClientResponseError && err.isAbort;
      if (isCancelled) return;
    }

    // Sahip değilse: bekleyen davetleri bağla ve üyeliğe bak (bkz. /api/team/accept).
    try {
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });

      if (response.ok) {
        const body = (await response.json()) as {
          memberships: { role: MemberRole; business: Business | null }[];
        };
        const membership = body.memberships.find((item) => item.business);
        if (membership?.business) {
          setBusinessState(membership.business);
          setRole(membership.role);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      /* üyelik akışı çalışmıyorsa sahiplik sonucuyla devam ediyoruz */
    }

    setBusinessState(null);
    setRole(null);
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
        role,
        isLoading: authLoading || isLoading,
        refresh,
        setBusiness: (next: Business) => {
          setBusinessState(next);
          setRole("owner");
        },
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
