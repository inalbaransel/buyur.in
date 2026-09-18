import { NextResponse, type NextRequest } from "next/server";
import { getServicePB, hasServiceCredentials } from "@/lib/pocketbase-server";
import {
  OTP_MAX_ATTEMPTS,
  hashOtpCode,
  isOtpExpired,
  isValidEmail,
  isValidOtpCode,
  matchesOtpHash,
  normalizeEmail,
} from "@/lib/otp";
import { bumpOtpAttempts, clearOtpRecords, findOtpRecord } from "@/lib/otp-store";

// Kayıt akışının ikinci adımı: kodu doğrular ve hesabı açar.
// Hesap oluşturma bilinçli olarak sunucuda: buyur_users createRule yalnızca
// servis hesabına açık olduğu için doğrulama adımı atlanamaz.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  if (!hasServiceCredentials()) {
    return NextResponse.json({ error: "Kayıt servisi yapılandırılmamış. Yöneticinize başvurun." }, { status: 503 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; passwordConfirm?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : password;

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Adını gir." }, { status: 400 });
  }
  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi gir." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "Şifreler eşleşmiyor." }, { status: 400 });
  }
  if (!isValidOtpCode(body.code)) {
    return NextResponse.json({ error: "Doğrulama kodu 6 haneli olmalı." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const code = body.code.trim();

  try {
    const pb = await getServicePB();

    const record = await findOtpRecord(pb, email);
    if (!record) {
      return NextResponse.json({ error: "Doğrulama kodu bulunamadı, yeni bir kod iste." }, { status: 400 });
    }
    if (isOtpExpired(record.expires_at)) {
      await clearOtpRecords(pb, email);
      return NextResponse.json({ error: "Kodun süresi doldu, yeni bir kod iste." }, { status: 400 });
    }
    if ((record.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      await clearOtpRecords(pb, email);
      return NextResponse.json({ error: "Çok fazla hatalı deneme. Yeni bir kod iste." }, { status: 429 });
    }
    if (!matchesOtpHash(record.code_hash, hashOtpCode(email, code))) {
      await bumpOtpAttempts(pb, record);
      return NextResponse.json({ error: "Kod hatalı, tekrar dene." }, { status: 400 });
    }

    let userId: string;
    try {
      const created = await pb.collection("buyur_users").create<{ id: string }>(
        {
          name,
          email,
          password,
          passwordConfirm: password,
          emailVisibility: false,
        },
        { requestKey: null }
      );
      userId = created.id;
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data?.email) {
        await clearOtpRecords(pb, email);
        return NextResponse.json({ error: "Bu e-posta zaten kayıtlı. Giriş yapmayı dene." }, { status: 409 });
      }
      throw err;
    }

    // Adres zaten OTP ile kanıtlandı; ikinci bir doğrulama maili gereksiz.
    // Ayrı adımda çünkü `verified` korumalı bir alan: yazılamazsa kayıt yine
    // geçerlidir, bayrağın düşmesi kimseyi panelin dışında bırakmaz.
    await pb
      .collection("buyur_users")
      .update(userId, { verified: true }, { requestKey: null })
      .catch((err) => console.error("[register] verified işaretlenemedi", userId, err));

    await clearOtpRecords(pb, email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register] hata", err);
    return NextResponse.json({ error: "Kayıt oluşturulamadı, tekrar dene." }, { status: 500 });
  }
}
