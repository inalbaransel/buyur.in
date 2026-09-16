import PocketBase from "pocketbase";
import { PB_URL } from "@/lib/pocketbase";

// Sunucu tarafı servis istemcisi. Menü ziyaretçileri artık PocketBase'e doğrudan
// yazmıyor (buyur_events createRule kapalı) — event'leri ve agregatları bu
// hesap yazar. Kimlik bilgileri yalnızca sunucu ortamında bulunur; NEXT_PUBLIC_
// öneki bilinçli olarak yok.
//
// Hesabı oluşturmak için: node scripts/create-service-account.mjs

const SERVICE_EMAIL = process.env.PB_SERVICE_EMAIL;
const SERVICE_PASSWORD = process.env.PB_SERVICE_PASSWORD;

let client: PocketBase | null = null;
let authPromise: Promise<void> | null = null;

// Tanı sayacı: bir isteğin kaç PocketBase turu attığını ölçmek için. Analitikte
// gecikmenin ana kaynağı hesaplama değil, sıralı ağ turları (her tur ~250ms).
let requestCount = 0;

export function pbRequestCount(): number {
  return requestCount;
}

export function hasServiceCredentials(): boolean {
  return Boolean(SERVICE_EMAIL && SERVICE_PASSWORD);
}

/** Servis hesabıyla oturum açmış PocketBase istemcisi. Kimlik bilgileri yoksa
 *  ya da oturum açılamıyorsa hata fırlatır — çağıran taraf bunu yutup akışı
 *  (ör. menü) asla bozmamalı. */
export async function getServicePB(): Promise<PocketBase> {
  if (!SERVICE_EMAIL || !SERVICE_PASSWORD) {
    throw new Error("PB_SERVICE_EMAIL / PB_SERVICE_PASSWORD tanımlı değil.");
  }

  if (!client) {
    client = new PocketBase(PB_URL);
    client.beforeSend = (url, options) => {
      requestCount += 1;
      return { url, options };
    };
  }
  const pb = client;

  if (!pb.authStore.isValid) {
    // Aynı anda gelen isteklerin her biri ayrı ayrı authWithPassword çağırmasın.
    if (!authPromise) {
      authPromise = pb
        .collection("buyur_admins")
        .authWithPassword(SERVICE_EMAIL, SERVICE_PASSWORD, { requestKey: null })
        .then(() => undefined)
        .finally(() => {
          authPromise = null;
        });
    }
    try {
      await authPromise;
    } catch (err) {
      pb.authStore.clear();
      throw err;
    }
  }

  return pb;
}
