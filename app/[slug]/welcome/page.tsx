"use client";

import Link from "next/link";
import { useMenu } from "@/components/menu/menu-provider";
import { highlightLabels } from "@/lib/labels";
import { facebookUrl, instagramUrl, tiktokUrl, whatsappUrl, youtubeUrl } from "@/lib/social";
import {
  ClockIcon,
  FacebookIcon,
  HighlightIcon,
  InstagramIcon,
  MapPinIcon,
  MessageIcon,
  PhoneIcon,
  TiktokIcon,
  WhatsappIcon,
  WifiIcon,
  YoutubeIcon,
} from "@/components/icons";

export default function WelcomePage() {
  const { business, base, locale, t, tf } = useMenu();
  const name = tf(business, "name");
  const description = tf(business, "description");

  const iconLinks = [
    business.instagram && { Icon: InstagramIcon, label: "Instagram", url: instagramUrl(business.instagram) },
    business.whatsapp && { Icon: WhatsappIcon, label: "WhatsApp", url: whatsappUrl(business.whatsapp) },
    business.phone && { Icon: PhoneIcon, label: t("phoneLabel"), url: `tel:${business.phone.replace(/\s/g, "")}` },
    business.google_maps_url && { Icon: MapPinIcon, label: t("locationLabel"), url: business.google_maps_url },
    business.tiktok && { Icon: TiktokIcon, label: "TikTok", url: tiktokUrl(business.tiktok) },
    business.youtube && { Icon: YoutubeIcon, label: "YouTube", url: youtubeUrl(business.youtube) },
    business.facebook && { Icon: FacebookIcon, label: "Facebook", url: facebookUrl(business.facebook) },
  ].filter((x): x is { Icon: typeof InstagramIcon; label: string; url: string } => Boolean(x));

  return (
    <div className="flex flex-col items-center px-5 pb-10 text-center">
      {/* Kapak şeridi — görsel yoksa hiç gösterilmez */}
      {business.cover_url && (
        <div className="relative -mx-5 !h-[250px] w-[calc(100%+2.5rem)] overflow-hidden">
          <picture>
            <img src={business.cover_url} alt="" loading="eager" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-paper" />
        </div>
      )}

      {/* Sosyal ikonlar */}
      {iconLinks.length > 0 && (
        <div className={`z-10 flex flex-wrap justify-center gap-3 ${business.cover_url ? "-mt-6" : "mt-8"}`}>
          {iconLinks.slice(0, 4).map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              title={s.label}
              aria-label={s.label}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-paper text-ink shadow-sm transition-transform hover:scale-105"
            >
              <s.Icon size={22} />
            </a>
          ))}
        </div>
      )}

      {/* Logo + isim */}
      {business.logo_url && (
        <div className="relative mt-6 h-28 w-28 overflow-hidden rounded-2xl border-4 border-paper bg-paper shadow-xl">
          <picture>
            <img src={business.logo_url} alt={name} loading="eager" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
        </div>
      )}
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">{name}</h1>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>}

      {/* WiFi şifresi */}
      {business.wifi_password && (
        <p className="mt-3 flex items-center gap-2 font-mono text-sm text-ink-soft">
          <WifiIcon size={16} />
          {t("wifiPasswordLabel")}: <span className="font-semibold text-ink">{business.wifi_password}</span>
        </p>
      )}

      {/* Öne çıkan özellikler */}
      {(business.highlights?.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {business.highlights.map((h) => (
            <span
              key={h}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider"
              style={{ borderColor: "var(--brand)", color: "var(--brand-text)" }}
            >
              <HighlightIcon highlight={h} size={14} strokeWidth={2} />
              {highlightLabels[locale][h]}
            </span>
          ))}
        </div>
      )}

      {/* Menü butonu */}
      <Link
        href={`${base}/menu`}
        className="mt-8 w-full max-w-sm rounded-md py-4 text-center font-display text-lg font-bold shadow-lg transition-opacity hover:opacity-90"
        style={{ background: "var(--brand)", color: "var(--brand-on)" }}
      >
        {t("menuButton")}
      </Link>

      {/* Değerlendir linki */}
      <Link
        href={`${base}/review`}
        className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink transition-colors hover:opacity-70"
      >
        <MessageIcon size={16} />
        {t("reviewUsCta")}
      </Link>

      {/* Adres + çalışma saatleri */}
      <div className="mt-8 w-full max-w-sm space-y-3 text-left">
        {(business.address || business.google_maps_url) && (
          <div className="rounded-xl border border-line bg-crema/40 p-4">
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              <MapPinIcon size={14} /> {t("addressLabel")}
            </p>
            <p className="mt-1.5 text-sm text-ink">
              {business.google_maps_url ? (
                <a href={business.google_maps_url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {business.address || t("showOnMap")}
                </a>
              ) : (
                business.address
              )}
            </p>
          </div>
        )}
        {business.working_hours && (
          <div className="rounded-xl border border-line bg-crema/40 p-4">
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              <ClockIcon size={14} /> {t("workingHoursLabel")}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{business.working_hours}</p>
          </div>
        )}
      </div>
    </div>
  );
}
