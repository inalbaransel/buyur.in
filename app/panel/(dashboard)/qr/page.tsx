"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { pb } from "@/lib/pocketbase";
import { useBusiness } from "@/components/panel/business-context";
import { useToast } from "@/components/panel/toast";
import { Button, Card, ErrorText, Input, Label, PageHeader, Select } from "@/components/panel/ui";
import { QrShare } from "@/components/panel/qr-share";
import { menuUrl } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { QrCodeIcon, TrashIcon } from "@/components/icons";
import type { QrCode, QrPlacement } from "@/lib/types";

// Etiketli QR kodları: masa, vitrin, Instagram… Her QR menü linkine `?qr=<code>`
// ekler; /api/track bu kodu tarama kaydına bağlar, böylece hangi QR'ın ne kadar
// tarandığı Trafik sayfasında karşılaştırılabilir.

const PLACEMENTS: { value: QrPlacement; label: string }[] = [
  { value: "table", label: "Masa" },
  { value: "counter", label: "Kasa / tezgâh" },
  { value: "window", label: "Vitrin" },
  { value: "instagram", label: "Instagram" },
  { value: "campaign", label: "Kampanya" },
  { value: "other", label: "Diğer" },
];

const PLACEMENT_LABELS = Object.fromEntries(PLACEMENTS.map((item) => [item.value, item.label])) as Record<
  QrPlacement,
  string
>;

function qrUrlFor(slug: string, code: string): string {
  return `${menuUrl(slug)}?qr=${encodeURIComponent(code)}`;
}

function QrCard({ code, slug, onDelete }: { code: QrCode; slug: string; onDelete: (code: QrCode) => void }) {
  const { toast } = useToast();
  const [dataUrl, setDataUrl] = useState("");
  const url = qrUrlFor(slug, code.code);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: "#231812", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url]);

  return (
    <Card className="flex gap-4">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-line bg-crema/40 p-2">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`${code.name} QR kodu`} className="h-full w-full" />
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-crema" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold">{code.name}</p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              {PLACEMENT_LABELS[code.placement] ?? code.placement}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(code)}
            aria-label={`${code.name} QR kodunu sil`}
            className="shrink-0 text-ink-soft transition-colors hover:text-paprika"
          >
            <TrashIcon size={16} />
          </button>
        </div>

        <p className="mt-2 truncate font-mono text-[11px] text-ink-soft">{url}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={dataUrl || undefined}
            download={`menuva-qr-${code.code}.png`}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:border-paprika hover:text-paprika"
          >
            PNG indir
          </a>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast("QR linki kopyalandı");
            }}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors hover:border-paprika hover:text-paprika"
          >
            Linki kopyala
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function QrCodesPage() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [codes, setCodes] = useState<QrCode[] | null>(null);
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState<QrPlacement>("table");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!business) return;
    try {
      const records = await pb.collection("menuva_qr_codes").getFullList<QrCode>({
        filter: pb.filter("business = {:id}", { id: business.id }),
        sort: "created",
        requestKey: null,
      });
      setCodes(records);
    } catch {
      setCodes([]);
    }
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!business) return;
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("QR koduna bir ad verin (ör. Masa 01).");
      return;
    }

    // Kod URL'de taşınıyor: okunur bir slug + kısa ek ile çakışmayı önlüyoruz.
    const base = slugify(trimmed) || placement;
    const suffix = Math.random().toString(36).slice(2, 5);
    const code = `${base}-${suffix}`.slice(0, 40);

    setSaving(true);
    try {
      await pb.collection("menuva_qr_codes").create({
        business: business.id,
        name: trimmed,
        code,
        placement,
        is_active: true,
      });
      setName("");
      toast("QR kodu oluşturuldu");
      await load();
    } catch {
      setError("QR kodu oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(code: QrCode) {
    // Silinen QR'ın geçmiş taramaları agregatlarda kalır; yalnızca yeni
    // taramalar bu koda bağlanmaz.
    try {
      await pb.collection("menuva_qr_codes").delete(code.id);
      toast("QR kodu silindi");
      await load();
    } catch {
      toast("QR kodu silinemedi");
    }
  }

  if (!business) return null;

  return (
    <div>
      <PageHeader
        title="QR kodlar"
        description="Masa, vitrin ve sosyal medya için ayrı QR'lar oluşturun; hangisinin daha çok tarandığını Trafik sayfasında görün"
      />

      <QrShare business={business} />

      <Card className="mt-6">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="qr-name">QR adı</Label>
            <Input
              id="qr-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Masa 01"
              maxLength={60}
            />
          </div>
          <div className="sm:w-48">
            <Label htmlFor="qr-placement">Nerede kullanılacak</Label>
            <Select
              id="qr-placement"
              value={placement}
              onChange={(event) => setPlacement(event.target.value as QrPlacement)}
            >
              {PLACEMENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" loading={saving}>
            <QrCodeIcon size={15} /> QR oluştur
          </Button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      {codes === null ? (
        <p className="mt-6 text-sm text-ink-soft">QR kodları yükleniyor…</p>
      ) : codes.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
          Henüz etiketli QR kodunuz yok. Yukarıdaki formla ilk QR&apos;ınızı oluşturun — masalara, vitrine ve
          Instagram profilinize farklı kodlar koyarsanız hangisinin işe yaradığını ölçebilirsiniz.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {codes.map((code) => (
            <QrCard key={code.id} code={code} slug={business.slug} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
