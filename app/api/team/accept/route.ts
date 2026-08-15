import { NextResponse, type NextRequest } from "next/server";
import PocketBase from "pocketbase";
import { PB_URL } from "@/lib/pocketbase";
import { getServicePB, hasServiceCredentials } from "@/lib/pocketbase-server";
import type { BusinessMember } from "@/lib/types";

// Davet kabulü. Davet edilen kullanıcı henüz üyelik kaydına bağlı olmadığı için
// (üyelikte `user` boş, `invited_email` dolu) kendi token'ıyla daveti göremez —
// koleksiyon kuralları bilinçli olarak buna izin vermiyor. Bu yüzden eşleştirmeyi
// sunucu yapıyor: çağıranın kimliğini doğrulayıp e-postasına gelmiş davetleri
// hesabına bağlıyor.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!hasServiceCredentials()) return NextResponse.json({ memberships: [] });

  // Token'ı kullanıcının kendi istemcisiyle doğruluyoruz (sahte token elenir).
  const userPb = new PocketBase(PB_URL);
  userPb.authStore.save(token, null);

  let userId = "";
  let email = "";
  try {
    const auth = await userPb.collection("menuva_users").authRefresh({ requestKey: null });
    userId = auth.record?.id ?? "";
    email = (auth.record?.email as string | undefined) ?? "";
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const service = await getServicePB();

    // 1) E-postasına gelmiş bekleyen davetleri hesabına bağla.
    if (email) {
      const pending = await service.collection("menuva_business_members").getFullList<BusinessMember>({
        filter: service.filter("invited_email = {:email} && status = {:status}", {
          email,
          status: "invited",
        }),
        requestKey: null,
      });

      for (const invitation of pending) {
        await service.collection("menuva_business_members").update(invitation.id, {
          user: userId,
          status: "active",
        });
      }
    }

    // 2) Aktif üyelikleri döndür.
    const memberships = await service.collection("menuva_business_members").getFullList<BusinessMember>({
      filter: service.filter("user = {:user} && status = {:status}", { user: userId, status: "active" }),
      expand: "business",
      requestKey: null,
    });

    return NextResponse.json({
      memberships: memberships.map((member) => ({
        id: member.id,
        role: member.role,
        business: (member.expand as { business?: { id: string } } | undefined)?.business ?? null,
      })),
    });
  } catch (err) {
    console.error("[team/accept] başarısız:", err);
    return NextResponse.json({ error: "team_unavailable" }, { status: 500 });
  }
}
