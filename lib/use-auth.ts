"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ClientResponseError, type AuthRecord } from "pocketbase";
import { pb } from "@/lib/pocketbase";

interface AuthContextType {
  user: AuthRecord;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

let refreshPromise: Promise<any> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthRecord>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set initial user synchronously from the client store if it exists
    setUser(pb.authStore.record);

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record);
    });

    async function validate() {
      // localStorage'daki oturum başka bir projeden kalma ya da artık var
      // olmayan bir kayda ait olabilir (aynı origin'i paylaşan farklı bir
      // Pocketbase uygulaması). Böyle bozuk bir token'la sessizce "giriş
      // yapılmış" görünmek yerine burada doğrulayıp temizliyoruz.
      if (pb.authStore.isValid) {
        try {
          if (!refreshPromise) {
            // requestKey: null -> React StrictMode'un dev'de effect'i iki kez
            // çalıştırması gibi durumlarda SDK'nın bu isteği "aynı isteğin
            // tekrarı" sanıp otomatik iptal etmesini engeller.
            refreshPromise = pb.collection("buyur_users").authRefresh({ requestKey: null })
              .finally(() => {
                refreshPromise = null;
              });
          }
          await refreshPromise;
        } catch (err) {
          const isCancelled = err instanceof ClientResponseError && err.isAbort;
          if (!isCancelled) {
            pb.authStore.clear();
          }
        }
      } else {
        pb.authStore.clear();
      }
      setUser(pb.authStore.record);
      setIsLoading(false);
    }
    validate();

    return unsubscribe;
  }, []);

  return React.createElement(AuthContext.Provider, { value: { user, isLoading } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
