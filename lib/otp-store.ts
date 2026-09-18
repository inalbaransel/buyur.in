// OTP kayıtlarının PocketBase tarafı. Koleksiyon yalnızca servis hesabına açık
// (buyur_admins) — kodların özeti bile tarayıcıya ulaşmamalı.

import type PocketBase from "pocketbase";
import { hashOtpCode, normalizeEmail, otpExpiresAt } from "@/lib/otp";

export const OTP_COLLECTION = "buyur_otps";

export interface OtpRecord {
  id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  created: string;
}

/** Bir adresin bekleyen kodu. Yoksa null. */
export async function findOtpRecord(pb: PocketBase, email: string): Promise<OtpRecord | null> {
  try {
    return await pb
      .collection(OTP_COLLECTION)
      .getFirstListItem<OtpRecord>(pb.filter("email = {:email}", { email: normalizeEmail(email) }), {
        sort: "-created",
        requestKey: null,
      });
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null;
    throw err;
  }
}

/** Bir adrese ait tüm kodları siler. Yeni kod üretilmeden ve kayıt
 *  tamamlandıktan sonra çağrılır: aynı anda iki geçerli kod dolaşmamalı. */
export async function clearOtpRecords(pb: PocketBase, email: string): Promise<void> {
  const records = await pb.collection(OTP_COLLECTION).getFullList<OtpRecord>({
    filter: pb.filter("email = {:email}", { email: normalizeEmail(email) }),
    requestKey: null,
  });
  await Promise.all(
    records.map((record) =>
      pb.collection(OTP_COLLECTION).delete(record.id, { requestKey: null }).catch(() => undefined)
    )
  );
}

export async function createOtpRecord(pb: PocketBase, email: string, code: string): Promise<OtpRecord> {
  return pb.collection(OTP_COLLECTION).create<OtpRecord>(
    {
      email: normalizeEmail(email),
      code_hash: hashOtpCode(email, code),
      expires_at: otpExpiresAt(),
      attempts: 0,
    },
    { requestKey: null }
  );
}

export async function bumpOtpAttempts(pb: PocketBase, record: OtpRecord): Promise<void> {
  await pb
    .collection(OTP_COLLECTION)
    .update(record.id, { attempts: (record.attempts ?? 0) + 1 }, { requestKey: null })
    .catch(() => undefined);
}
