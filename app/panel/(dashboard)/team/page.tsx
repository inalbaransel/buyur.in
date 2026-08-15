"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/lib/use-auth";
import { useBusiness } from "@/components/panel/business-context";
import { useToast } from "@/components/panel/toast";
import { Button, Card, ErrorText, Input, Label, PageHeader, Select, UpgradeNotice } from "@/components/panel/ui";
import { fetchPlanLimits } from "@/lib/plan-limits";
import { TrashIcon, UsersIcon } from "@/components/icons";
import type { BusinessMember, MemberRole } from "@/lib/types";

// Ekip yönetimi. Rol → izin eşlemesi tek kaynaktan (lib/analytics/access.ts)
// geliyor ve API tarafında bağlayıcı; buradaki açıklamalar onun karşılığı.
//
// Not: üye ekleme/çıkarma PocketBase kurallarında işletme sahibine bağlı, bu
// yüzden panelde de yalnızca sahip yönetebiliyor (admin rolü analitiği görür,
// ekibi değiştiremez).

const ROLE_OPTIONS: { value: MemberRole; label: string; description: string }[] = [
  { value: "admin", label: "Yönetici", description: "Analiz, raporlar ve dışa aktarma dahil her şey" },
  { value: "manager", label: "Müdür", description: "Analiz ve raporları görüntüler, dışa aktaramaz" },
  { value: "staff", label: "Personel", description: "Yalnızca temel analiz özetini görür" },
];

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  manager: "Müdür",
  staff: "Personel",
};

export default function TeamPage() {
  const { user } = useAuth();
  const { business, role } = useBusiness();
  const { toast } = useToast();

  const [members, setMembers] = useState<BusinessMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("manager");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!business) return;
    fetchPlanLimits(business.plan).then((limits) => setAllowed(limits.team_management));
  }, [business]);

  const load = useCallback(async () => {
    if (!business) return;
    try {
      const records = await pb.collection("menuva_business_members").getFullList<BusinessMember>({
        filter: pb.filter("business = {:id}", { id: business.id }),
        expand: "user",
        sort: "created",
        requestKey: null,
      });
      setMembers(records);
    } catch {
      setMembers([]);
    }
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!business) return;
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (members?.some((member) => member.invited_email?.toLowerCase() === trimmed)) {
      setError("Bu e-posta zaten davet edilmiş.");
      return;
    }

    setSaving(true);
    try {
      // Davet, kişi hesap açtığında /api/team/accept ile hesabına bağlanır.
      await pb.collection("menuva_business_members").create({
        business: business.id,
        invited_email: trimmed,
        role: inviteRole,
        status: "invited",
      });
      setEmail("");
      toast("Davet oluşturuldu");
      await load();
    } catch {
      setError("Davet oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(member: BusinessMember, next: MemberRole) {
    try {
      await pb.collection("menuva_business_members").update(member.id, { role: next });
      toast("Rol güncellendi");
      await load();
    } catch {
      toast("Rol güncellenemedi");
    }
  }

  async function handleRemove(member: BusinessMember) {
    try {
      await pb.collection("menuva_business_members").delete(member.id);
      toast("Üye çıkarıldı");
      await load();
    } catch {
      toast("Üye çıkarılamadı");
    }
  }

  if (!business) return null;

  if (role !== "owner") {
    return (
      <div>
        <PageHeader title="Ekip" description="İşletmenizdeki kullanıcılar ve yetkileri" />
        <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
          Ekip yönetimi yalnızca işletme sahibinde. Rolünüz: {role ? ROLE_LABELS[role] : "—"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Ekip"
        description="Analiz ve raporlara kimin erişeceğini belirleyin — her rol farklı yetki taşır"
      />

      {allowed === false ? (
        <UpgradeNotice
          title="Ekip yönetimi mevcut planında kapalı"
          description="Ekip üyesi davet etmek ve rol atamak için planını yükseltmen gerekiyor."
        />
      ) : (
        <>
          <Card>
            <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="member-email">E-posta</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ekip@isletmeniz.com"
                />
              </div>
              <div className="sm:w-52">
                <Label htmlFor="member-role">Rol</Label>
                <Select
                  id="member-role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as MemberRole)}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" loading={saving}>
                <UsersIcon size={15} /> Davet et
              </Button>
            </form>
            <ErrorText>{error}</ErrorText>
            <p className="mt-3 text-xs text-ink-soft">
              {ROLE_OPTIONS.find((option) => option.value === inviteRole)?.description}
            </p>
          </Card>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4">
              <div>
                <p className="font-medium">{user?.name ?? user?.email ?? "Siz"}</p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                  {ROLE_LABELS.owner} · tüm yetkiler
                </p>
              </div>
            </div>

            {members === null ? (
              <p className="text-sm text-ink-soft">Ekip yükleniyor…</p>
            ) : members.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
                Henüz ekip üyeniz yok. Yukarıdaki formla analiz ve raporlara erişmesini istediğiniz kişileri davet
                edebilirsiniz.
              </p>
            ) : (
              members.map((member) => {
                const memberUser = (member.expand as { user?: { name: string; email: string } } | undefined)?.user;
                return (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {memberUser?.name || memberUser?.email || member.invited_email}
                      </p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                        {member.status === "invited" ? "Davet bekliyor" : "Aktif"} ·{" "}
                        {member.invited_email || memberUser?.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onChange={(event) => handleRoleChange(member, event.target.value as MemberRole)}
                        aria-label={`${member.invited_email} rolü`}
                        className="w-40"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        aria-label="Üyeyi çıkar"
                        className="text-ink-soft transition-colors hover:text-paprika"
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-crema/40 p-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Roller ne yapabilir</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <span className="font-semibold">Sahip / Yönetici:</span> tüm analizler, raporlar, dışa aktarma
              </li>
              <li>
                <span className="font-semibold">Müdür:</span> gelişmiş analizler ve raporları görüntüleme
              </li>
              <li>
                <span className="font-semibold">Personel:</span> yalnızca temel analiz özeti
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
