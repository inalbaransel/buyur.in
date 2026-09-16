import { PLAN_PRICING, formatTL } from "@/lib/pricing";
import { CheckCircleIcon } from "@/components/icons";

// Kâğıt menü karşılaştırması + özellik matrisi. Satın alma kararını etkileyen
// üç sonuç sayfanın üstünde; buradaki detaylar ikna değil, kontrol listesi.

const rows = [
  { label: "Fiyat değişikliği", paper: "Yeniden baskı, günlerce bekleme", buyur: "Panelden anında, tüm masalarda" },
  { label: "Tükenen ürün", paper: "Garson masada söyler", buyur: "Tek dokunuşla menüden kalkar" },
  {
    label: "Maliyet",
    paper: "Her zamda yeni baskı",
    buyur: `Ücretsiz başlar · Premium ayda ${formatTL(PLAN_PRICING.premium.yearlyMonthly)}'den`,
  },
  { label: "Yabancı misafir", paper: "Tek dil", buyur: "TR · EN · AR · RU" },
  { label: "Alerjen ve kalori", paper: "Çoğunlukla yok", buyur: "Her üründe gösterilebilir" },
  { label: "Sipariş", paper: "Garson not alır, karışabilir", buyur: "Müşteri seçimini sepette garsona gösterir" },
  { label: "Hangi ürün ilgi görüyor?", paper: "Bilinmez", buyur: "Panelde ürün ve QR bazında" },
  { label: "Hijyen", paper: "Elden ele dolaşır", buyur: "Müşterinin kendi telefonunda" },
];

const features = [
  "Hazırlanma süresi",
  "Kalori ve alerjen bilgisi",
  "Rozetler: Şefin önerisi, Yeni, Popüler",
  "Boy ve ekstra seçenekleri",
  "Menü içi arama",
  "4 dilde menü",
  "Size özel menü adresi",
  "Kategori sürükle-bırak sıralama",
  "Müşteri değerlendirmesi",
  "Wi-Fi, adres, çalışma saatleri",
  "Kampanya ve açılış pop-up'ı (Premium)",
  "Otomatik web sitesi (Premium)",
];

export function Comparison() {
  return (
    <section id="karsilastir" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">Karşılaştırın</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Kâğıt menü mü, buyur mı?</h2>
        </div>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line bg-crema/50 text-left">
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-soft" scope="col">
                  <span className="sr-only">Konu</span>
                </th>
                <th className="px-5 py-3 font-display text-base font-bold text-ink-soft" scope="col">
                  Kâğıt menü
                </th>
                <th className="px-5 py-3 font-display text-base font-bold text-paprika" scope="col">
                  buyur
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-medium">
                    {row.label}
                  </th>
                  <td className="px-5 py-3 text-ink-soft">{row.paper}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-herb" aria-hidden>
                        <CheckCircleIcon size={15} />
                      </span>
                      {row.buyur}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Menüde ayrıca</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {features.map((feature) => (
              <li key={feature} className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
