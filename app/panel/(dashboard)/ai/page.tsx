"use client";

import { useBusiness } from "@/components/panel/business-context";
import { Card, PageHeader, Spinner, UpgradeNotice } from "@/components/panel/ui";
import { MenuImport } from "@/components/panel/ai/menu-import";
import { aiUsage, isFeatureAvailable } from "@/lib/entitlements";
import { SparklesIcon } from "@/components/icons";

// Yapay Zeka — fiziksel menüyü dijitale taşıyan tek ekran.
//
// Çoklu dil üretimi bilinçli olarak buradan kaldırıldı: toplu çeviri her
// basışta tüm menüyü yeniden çeviriyordu. Artık çeviri, kategori/ürün formunun
// sağ üstündeki "Diğer dilleri tamamla" butonuyla yalnızca düzenlenen kayıt
// için çalışır (bkz. components/panel/ai/translate-button.tsx).

export default function AiPage() {
  const { business, isLoading } = useBusiness();

  if (isLoading || !business) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-paprika" />
      </div>
    );
  }

  if (!isFeatureAvailable(business, "ai_menu_import")) {
    return (
      <>
        <PageHeader title="Yapay Zeka" description="Menünüzü yapay zekâ ile hazırlayın." />
        <UpgradeNotice
          title="Yapay zekâ araçları planınızda kapalı"
          description="Fiziksel menünüzü fotoğraftan otomatik aktarmak için planınızı yükseltin."
        />
      </>
    );
  }

  const usage = aiUsage(business);

  return (
    <>
      <PageHeader
        title="Yapay Zeka"
        description="Fiziksel menünüzün fotoğrafını yükleyin, ürünler otomatik okunup listeye eklensin."
        action={
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-crema/40 px-4 py-2">
            <SparklesIcon size={16} className="text-paprika" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              {usage.limit === null
                ? "Sınırsız tarama"
                : `Bu ay ${usage.used}/${usage.limit} tarama`}
            </span>
          </div>
        }
      />

      {usage.exhausted ? (
        <Card className="border-paprika/40 bg-paprika/5 text-center">
          <p className="font-display text-lg font-bold">Bu ayki tarama hakkınız doldu</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {usage.limit} taramanın tamamını kullandınız. Hakkınız gelecek ay yenilenir; daha fazlası için
            planınızı yükseltebilirsiniz.
          </p>
        </Card>
      ) : (
        <MenuImport business={business} />
      )}
    </>
  );
}
