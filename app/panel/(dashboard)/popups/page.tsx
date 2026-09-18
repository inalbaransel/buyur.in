"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { useToast } from "@/components/panel/toast";
import { Button, Card, EmptyState, FooterNote, PageHeader, UpdatedAt, UpgradeNotice } from "@/components/panel/ui";
import { fetchPlanLimits } from "@/lib/plan-limits";
import type { Popup } from "@/lib/types";

export default function AnnouncementsPage() {
  const { business, isLoading: businessLoading } = useBusiness();
  const { toast } = useToast();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignsAllowed, setCampaignsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!business) return;
    load();
  }, [business]);

  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    fetchPlanLimits(business.plan).then((limits) => {
      if (!cancelled) setCampaignsAllowed(limits.campaigns);
    });
    return () => {
      cancelled = true;
    };
  }, [business]);

  async function load() {
    if (!business) return;
    setLoading(true);
    const list = await pb.collection("buyur_popups").getFullList<Popup>({
      filter: pb.filter("business = {:id}", { id: business.id }),
      sort: "-created",
    });
    setPopups(list);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu duyuruyu silmek istediğine emin misin?")) return;
    await pb.collection("buyur_popups").delete(id);
    await load();
    toast("Kampanya silindi");
  }

  if (businessLoading || loading) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  // Listedeki en yeni kayıt zamanı — sağ alttaki bilgi satırında gösterilir.
  const latestUpdate = popups.reduce<string | null>((max, item) => (!max || item.updated > max ? item.updated : max), null);

  return (
    <div>
      <PageHeader
        title="Kampanyalar"
        description="Müşteri menüyü açtığında gösterilecek kampanya ya da duyuru."
        action={
          campaignsAllowed && (
            <Link href="/panel/popups/new">
              <Button>+ Yeni kampanya</Button>
            </Link>
          )
        }
      />

      {campaignsAllowed === false && (
        <UpgradeNotice
          title="Kampanyalar mevcut planında kapalı"
          description="Menü açıldığında gösterilecek kampanya/duyuru oluşturmak için planını yükseltmen gerekiyor."
        />
      )}

      {campaignsAllowed && popups.length === 0 && (
        <EmptyState
          title="Henüz duyuru yok"
          description="Menü açıldığında gösterilecek bir kampanya duyurusu oluştur."
          action={
            <Link href="/panel/popups/new">
              <Button>+ Yeni duyuru</Button>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {popups.map((p) => (
          <Card key={p.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              )}
              <div>
                <p className="font-display font-bold">
                  {p.title}{" "}
                  {!p.is_active && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">(pasif)</span>
                  )}
                </p>
                {p.message && <p className="text-sm text-ink-soft">{p.message}</p>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={`/panel/popup/${p.id}`}>
                <Button variant="outline">Düzenle</Button>
              </Link>
              <Button variant="danger" onClick={() => handleDelete(p.id)}>
                Sil
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <FooterNote>
        <UpdatedAt at={latestUpdate} />
      </FooterNote>
    </div>
  );
}
