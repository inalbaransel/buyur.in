import Link from "next/link";

const menuFeatures = [
  {
    name: "Sürükle & Bırak Yönetim",
    desc: "Kategorileri ve ürünleri parmağınızla sıralayın. Teknik bilgi gerekmez — kahvaltıyı sabah öne alın, akşam ana yemekleri.",
    tag: "dahil",
  },
  {
    name: "Anlık Güncellemeler",
    desc: "Fiyat değişti mi? İki dakikada tüm menü güncel. Tükenen ürünü tek dokunuşla gizleyin, müşteri boşa heveslenmesin.",
    tag: "dahil",
  },
  {
    name: "QR Kod & Özel URL",
    desc: "mekan-adiniz.menuvaapp.com — size özel adres ve QR kod. Masaya, vitrine, Instagram bio'suna; nereye isterseniz.",
    tag: "dahil",
  },
  {
    name: "Özelleştirilebilir Tasarım",
    desc: "Kendi renkleriniz, logonuz, görselleriniz. Menü sizin markanız gibi görünür, bizim değil.",
    tag: "dahil",
  },
  {
    name: "Hazırlanma Süreleri",
    desc: "Her ürünün yanında tahmini süre. Öğle arası dar olan müşteri 10 dakikalık ürünü seçer, kimse masada beklemez.",
    tag: "dahil",
  },
  {
    name: "Sipariş Sepeti",
    desc: "Müşteri seçimlerini sepete atar, garsona telefonu gösterir. Yanlış sipariş, unutulan not derdi biter.",
    tag: "dahil",
  },
];

const adminTools = [
  { icon: "🏷️", name: "Ürün rozetleri", desc: "\u201CŞefin önerisi\u201D, \u201CYeni\u201D, \u201CPopüler\u201D — satışı yönlendirin" },
  { icon: "💯", name: "Kampanyalar", desc: "İndirim tanımlayın, menüde otomatik görünsün" },
  { icon: "🔥", name: "Kalori bilgisi", desc: "Ürün başına kalori değeri gösterin" },
  { icon: "🦠", name: "Alerjen uyarıları", desc: "Gluten, fıstık, laktoz — müşteri güveni kazanın" },
  { icon: "🪟", name: "Pop-up kampanyalar", desc: "Menü açılışında kampanya ya da duyuru gösterin" },
  { icon: "🔄", name: "Ürün seçenekleri", desc: "Boy, ekstra malzeme gibi varyantlar ekleyin" },
];

export function MenuFeatures() {
  return (
    <section id="menu" className="border-y border-line bg-crema/40">
      <div className="mx-auto max-w-4xl px-5 py-24">
        <p className="text-center font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">
          Günün menüsü
        </p>
        <h2 className="mt-3 text-center font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Hepsi taze, hepsi dahil
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-ink-soft">
          Bir menüden beklediğiniz her şey — servis ücreti almadan.
        </p>

        <div className="mt-14 space-y-9">
          {menuFeatures.map((f) => (
            <div key={f.name} data-reveal>
              <div className="dot-leader">
                <h3 className="font-display text-xl font-bold md:text-2xl">
                  {f.name}
                </h3>
                <span className="dots" />
                <span className="font-mono text-sm font-medium uppercase tracking-wider text-herb">
                  {f.tag}
                </span>
              </div>
              <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminTools() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="md:flex md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">
            Mutfağın arkası
          </p>
          <h2 className="mt-3 max-w-md font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Panel sizin, kontrol sizde
          </h2>
        </div>
        <p className="mt-4 max-w-sm text-ink-soft md:mt-0">
          Menüyü yayınlamak işin başı. menuva paneli, satışı artıran
          araçlarla birlikte gelir.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminTools.map((t) => (
          <div
            key={t.name}
            data-reveal
            className="group rounded-xl border border-line bg-paper p-6 transition-colors hover:border-paprika"
          >
            <span className="text-2xl" aria-hidden>
              {t.icon}
            </span>
            <h3 className="mt-3 font-display text-lg font-bold">{t.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {t.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  {
    n: "1",
    title: "Kaydolun",
    desc: "E-postanızla hesap açın, mekanınızın adını yazın. Kredi kartı gerekmez.",
  },
  {
    n: "2",
    title: "Menünüzü kurun",
    desc: "Kategorileri ve ürünleri ekleyin, görselleri yükleyin, fiyatları girin. Sürükleyin, bırakın, bitti.",
  },
  {
    n: "3",
    title: "QR'ı masaya koyun",
    desc: "Otomatik oluşan QR kodunuzu indirin, bastırın, masalara yerleştirin. Menünüz yayında.",
  },
];

export function HowItWorks() {
  return (
    <section id="nasil" className="border-y border-line bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-paprika">
          Nasıl çalışır
        </p>
        <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Kayıttan servise: 5 dakika
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.n}
              data-reveal
              style={{ transitionDelay: `${i * 110}ms` }}
              className="group border-t-2 border-paprika pt-5"
            >
              <span className="font-mono text-sm text-paprika">{s.n}.</span>
              <h3 className="mt-2 font-display text-2xl font-bold transition-colors group-hover:text-paprika">
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-paper/60">{s.desc}</p>
            </div>
          ))}
        </div>

        <div
          data-reveal
          className="mt-16 flex flex-col items-center gap-5 rounded-2xl border border-paper/12 bg-paper/[0.04] p-8 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <div>
            <p className="font-display text-xl font-bold">
              Kurulum için kimseyi beklemenize gerek yok.
            </p>
            <p className="mt-1.5 text-sm text-paper/60">
              Hesabınızı şimdi açın, menünüz akşam servisine yetişsin.
            </p>
          </div>
          <Link
            href="/panel/register"
            className="shine-on-hover relative w-full shrink-0 overflow-hidden rounded-full bg-paprika px-8 py-3.5 text-center font-mono text-[13px] uppercase tracking-wider text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-paprika-deep sm:w-auto"
          >
            Ücretsiz başla
          </Link>
        </div>
      </div>
    </section>
  );
}
