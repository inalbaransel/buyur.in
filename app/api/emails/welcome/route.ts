import { NextResponse, type NextRequest } from "next/server";
import { createServerPB } from "@/lib/pocketbase";
import { isEmailConfigured, sendWelcomeEmail } from "@/lib/email";
import type { Business } from "@/lib/types";

// İşletme kurulduktan sonra tetiklenen karşılama maili. Alıcı adresi istemciden
// alınmaz; oturumun kendi kaydından okunur — aksi halde uç, herkese mail atan
// bir kapıya dönüşürdü.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "E-posta servisi yapılandırılmamış." }, { status: 503 });
  }

  let body: { businessId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  if (typeof body.businessId !== "string" || body.businessId.trim() === "") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const pb = createServerPB();
  pb.authStore.save(authHeader, null);
  try {
    await pb.collection("buyur_users").authRefresh();
  } catch {
    return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });
  }

  const user = pb.authStore.record;
  const email = typeof user?.email === "string" ? user.email : "";
  if (!user || !email) {
    return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });
  }

  let business: Business;
  try {
    business = await pb.collection("buyur_businesses").getOne<Business>(body.businessId);
  } catch {
    return NextResponse.json({ error: "İşletme bulunamadı." }, { status: 404 });
  }
  if (business.owner !== user.id) {
    return NextResponse.json({ error: "Bu işletmeye erişiminiz yok." }, { status: 403 });
  }

  try {
    await sendWelcomeEmail(email, {
      userName: typeof user.name === "string" ? user.name : "",
      businessName: business.name,
      slug: business.slug,
    });
  } catch (err) {
    // Mail gitmemesi kurulumu bozmaz; kullanıcı zaten panelde.
    console.error("[welcome] mail gönderilemedi", business.id, err);
    return NextResponse.json({ error: "Karşılama e-postası gönderilemedi." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
