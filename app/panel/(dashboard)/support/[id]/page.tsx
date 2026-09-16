"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { useToast } from "@/components/panel/toast";
import { Button, Card, ErrorText, Textarea } from "@/components/panel/ui";
import { ArrowLeftIcon } from "@/components/icons";
import type { SupportTicket, TicketMessage, TicketStatus } from "@/lib/types";

const statusLabels: Record<TicketStatus, string> = {
  open: "Açık",
  answered: "Yanıtlandı",
  closed: "Kapalı",
};

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const { toast } = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [t, msgs] = await Promise.all([
      pb.collection("buyur_support_tickets").getOne<SupportTicket>(ticketId, { requestKey: null }),
      pb.collection("buyur_ticket_messages").getFullList<TicketMessage>({
        filter: pb.filter("ticket = {:id}", { id: ticketId }),
        sort: "created",
        requestKey: null,
      }),
    ]);
    setTicket(t);
    setMessages(msgs);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !ticket) return;
    setSending(true);
    setError("");
    try {
      await pb.collection("buyur_ticket_messages").create({ ticket: ticket.id, sender: "user", body: body.trim() });
      // Kullanıcı yanıtlayınca talep tekrar "open"a döner — admin'in tekrar
      // bakması gerektiğinin işareti.
      if (ticket.status !== "open") {
        await pb.collection("buyur_support_tickets").update(ticket.id, { status: "open" });
      }
      setBody("");
      await load();
    } catch {
      setError("Gönderilemedi, tekrar dene.");
      toast("Gönderilemedi, tekrar dene.", "error");
    } finally {
      setSending(false);
    }
  }

  if (loading || !ticket) {
    return <p className="text-ink-soft">Yükleniyor…</p>;
  }

  return (
    <div>
      <Link
        href="/panel/support"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-paprika"
      >
        <ArrowLeftIcon size={15} />
        Destek taleplerine dön
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-ink-soft">{statusLabels[ticket.status]}</p>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <Card key={m.id} className={m.sender === "admin" ? "border-paprika/30 bg-paprika/5" : ""}>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              {m.sender === "admin" ? "buyur ekibi" : "Sen"} · {new Date(m.created).toLocaleString("tr-TR")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.body}</p>
          </Card>
        ))}
      </div>

      {ticket.status !== "closed" ? (
        <form onSubmit={handleReply} className="mt-6 space-y-3">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Yanıtını yaz…" />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={sending}>
            Gönder
          </Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">Bu talep kapatıldı.</p>
      )}
    </div>
  );
}
