"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/lib/use-auth";
import { useBusiness } from "@/components/panel/business-context";
import { useToast } from "@/components/panel/toast";
import { Button, Card, EmptyState, ErrorText, Input, Label, PageHeader, Textarea } from "@/components/panel/ui";
import type { SupportTicket, TicketStatus } from "@/lib/types";

const statusLabels: Record<TicketStatus, string> = {
  open: "Açık",
  answered: "Yanıtlandı",
  closed: "Kapalı",
};

const statusTone: Record<TicketStatus, string> = {
  open: "text-paprika",
  answered: "text-herb",
  closed: "text-ink-soft",
};

function NewTicketForm({
  businessId,
  userId,
  onCreated,
}: {
  businessId: string;
  userId: string;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Konu ve mesaj gerekli.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const ticket = await pb.collection("buyur_support_tickets").create<SupportTicket>({
        business: businessId,
        user: userId,
        subject: subject.trim(),
        status: "open",
      });
      await pb.collection("buyur_ticket_messages").create({
        ticket: ticket.id,
        sender: "user",
        body: body.trim(),
      });
      toast("Destek talebi oluşturuldu");
      onCreated(ticket);
    } catch {
      setError("Gönderilemedi, tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="subject">Konu</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ör. Fatura ile ilgili bir sorum var"
          />
        </div>
        <div>
          <Label htmlFor="body">Mesaj</Label>
          <Textarea id="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={saving}>
          Gönder
        </Button>
      </form>
    </Card>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const { business, isLoading: businessLoading } = useBusiness();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    pb.collection("buyur_support_tickets")
      .getFullList<SupportTicket>({
        filter: pb.filter("user = {:id}", { id: user.id }),
        sort: "-created",
        requestKey: null,
      })
      .then(setTickets)
      .finally(() => setLoading(false));
  }, [user]);

  if (businessLoading || loading || !business || !user) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Destek"
        description="buyur ekibine soru sor, talep aç."
        action={
          <Button variant={showForm ? "outline" : "primary"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Vazgeç" : "Yeni talep"}
          </Button>
        }
      />

      {showForm && (
        <NewTicketForm
          businessId={business.id}
          userId={user.id}
          onCreated={(ticket) => {
            setTickets((prev) => [ticket, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {tickets.length === 0 ? (
        <EmptyState
          title="Henüz destek talebin yok"
          description="Bir sorun mu var? Yukarıdan yeni talep açabilirsin."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/panel/support/${t.id}`}>
              <Card className="transition-colors hover:border-paprika/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{t.subject}</p>
                  <span className={`font-mono text-[11px] uppercase tracking-wider ${statusTone[t.status]}`}>
                    {statusLabels[t.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {new Date(t.created).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
