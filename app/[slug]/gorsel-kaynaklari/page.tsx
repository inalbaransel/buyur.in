"use client";

import { useMenu } from "@/components/menu/menu-provider";
import { ImageCreditList } from "@/components/menu/image-credit";

// Görsel kaynakları sayfası. CC BY / CC BY-SA lisanslı görseller için
// fotoğrafçı, kaynak ve lisans burada toplu hâlde gösterilir; menü altbilgisi
// buraya bağlanır. Künye gerektiren görsel yoksa sayfa boş değil, açıklayıcı
// bir metinle açılır (link zaten basılmaz, elle gelen kullanıcı kaybolmasın).

export default function ImageCreditsPage() {
  const { products, locale, t } = useMenu();

  return (
    <div className="space-y-4 px-5 py-6">
      <h1 className="font-display text-2xl font-extrabold leading-tight">{t("imageCreditsTitle")}</h1>
      <p className="text-sm leading-relaxed text-ink-soft">{t("imageCreditsIntro")}</p>
      <ImageCreditList products={products} locale={locale} />
    </div>
  );
}
