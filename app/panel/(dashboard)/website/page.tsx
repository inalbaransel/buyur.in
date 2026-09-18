"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/components/panel/business-context";
import { useToast } from "@/components/panel/toast";
import { buttonClass, Card, PageHeader } from "@/components/panel/ui";
import { PlanLocked } from "@/components/panel/analytics/states";
import { CheckCircleIcon, ExternalLinkIcon, GlobeIcon } from "@/components/icons";
import { menuUrl, whatsappLink } from "@/lib/site";
import { isFeatureAvailable } from "@/lib/entitlements";

// Web sitesi sayfası. Burada düzenlenecek bir şey yok — ve bu bilinçli:
// site, panelde girilen bilgilerden otomatik üretiliyor. Sayfanın işi adresi
// vermek, neyin siteye yansıdığını göstermek ve eksik bilgiyi hatırlatmak.

export default function WebsitePage() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    if (business) setSiteUrl(`${menuUrl(business.slug)}/site`);
  }, [business]);

  if (!business) return null;

  const hasWebsite = isFeatureAvailable(business, "custom_website");
  const isAdvanced = isFeatureAvailable(business, "advanced_website");
  // Elite'in ayrıcalığı: otomatik menü sitesinden BAĞIMSIZ, kurulumunu bizim
  // yaptığımız kurumsal site. Panelde üretilmez — talebi buradan başlatılır.
  const isGifted = isFeatureAvailable(business, "gifted_website");

  if (!hasWebsite) {
    return (
      <div>
        <PageHeader title="Web sitesi" description="İşletmenizin bilgilerinden otomatik oluşan restoran sitesi" />
        <PlanLocked
          title="Standart Web Sitesi, Premium ve Elite planlarında kullanılabilir"
          description="Panelde girdiğiniz bilgilerden (menü, görseller, çalışma saatleri, konum, iletişim) otomatik bir restoran web sitesi oluşturulur. Ayrı bir site kurmanıza, içerik girmenize ya da güncelleme yapmanıza gerek kalmaz. Elite planında bu site gelişmiş deneyime yükselir ve ayrıca kurumsal web sitenizin kurulumu hediye edilir."
        />
      </div>
    );
  }

  // Siteyi zenginleştiren ama eksik olabilecek alanlar — kullanıcıya somut iş verir.
  const missing = [
    { key: "cover_url", label: "Kapak görseli", filled: Boolean(business.cover_url) },
    { key: "description", label: "İşletme açıklaması", filled: Boolean(business.description) },
    { key: "working_hours", label: "Çalışma saatleri", filled: Boolean(business.working_hours) },
    { key: "address", label: "Adres", filled: Boolean(business.address) },
    { key: "phone", label: "Telefon", filled: Boolean(business.phone) },
    { key: "whatsapp", label: "WhatsApp (rezervasyon için)", filled: Boolean(business.whatsapp) },
    { key: "google_maps_url", label: "Harita bağlantısı", filled: Boolean(business.google_maps_url) },
  ];
  const missingCount = missing.filter((item) => !item.filled).length;

  return (
    <div>
      <PageHeader
        title="Web sitesi"
        description="İşletme bilgilerinizden otomatik oluşturulur — ayrıca içerik girmenize gerek yok"
        action={
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("primary")}
          >
            <ExternalLinkIcon size={15} /> Siteyi aç
          </a>
        }
      />

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <GlobeIcon size={14} /> Site adresiniz
          </p>
          <p className="mt-1 truncate font-display text-lg font-bold text-paprika">{siteUrl}</p>
          <p className="mt-1 text-xs text-ink-soft">
            {isAdvanced
              ? "Elite — Gelişmiş Web Sitesi: animasyonlu tanıtım, menü slider'ı ve galeri dahil."
              : "Premium — Standart Web Sitesi: sade ve profesyonel restoran sitesi."}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(siteUrl);
            toast("Site adresi kopyalandı");
          }}
          className={buttonClass("outline", "shrink-0")}
        >
          Adresi kopyala
        </button>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">Sitede ne görünüyor</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              "İşletme adı, logo ve kapak görseli",
              "Açıklamanız ve mekân özellikleriniz",
              "Menüden öne çıkan ürünler ve kategoriler",
              ...(isAdvanced ? ["Ürün görsellerinden otomatik galeri", "Animasyonlu tanıtım ve menü slider'ı"] : []),
              "Çalışma saatleri, konum ve yol tarifi",
              "Telefon, WhatsApp, e-posta ve sosyal medya",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-herb" aria-hidden>
                  <CheckCircleIcon size={15} />
                </span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            Menüde ya da ayarlarda yaptığınız her değişiklik siteye kendiliğinden yansır. Sitede ayrı bir içerik
            yönetimi yoktur — tek kaynak paneldir.
          </p>
        </Card>

        <Card>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            {missingCount === 0 ? "Bilgileriniz tam" : `Siteyi güçlendirin (${missingCount} eksik)`}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {missing.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className={item.filled ? "" : "text-ink-soft"}>{item.label}</span>
                {item.filled ? (
                  <span className="text-herb" aria-label="dolu">
                    <CheckCircleIcon size={15} />
                  </span>
                ) : (
                  <Link
                    href="/panel/settings"
                    className="font-mono text-[11px] uppercase tracking-wider text-paprika transition-colors hover:text-paprika-deep"
                  >
                    Ekle
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            Eksik bilgiye ait bölüm sitede hiç gösterilmez; boş bir alan görünmez.
          </p>
        </Card>
      </div>

      {isGifted && (
        <Card className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-paprika">Elite hediyesi</p>
          <p className="mt-2 font-display text-lg font-bold">Kurumsal web siteniz bizden</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Yukarıdaki otomatik site menünüzden üretilir. Elite aboneliğinizle birlikte, bundan bağımsız standart bir
            kurumsal web sitesinin kurulumunu da biz üstleniyoruz: tanıtım sayfaları, görsel düzen, alan adı bağlantısı
            ve yayına alma. Aboneliğiniz sürdüğü sürece bu kurulum için ücret alınmaz; alan adı ve üçüncü taraf servis
            bedelleri kapsam dışıdır.
          </p>
          <a
            href={whatsappLink("Merhaba, Elite planındaki hediye kurumsal web sitesi kurulumunu başlatmak istiyorum.")}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("primary", "mt-4")}
          >
            Kurulumu başlat
          </a>
        </Card>
      )}
    </div>
  );
}
