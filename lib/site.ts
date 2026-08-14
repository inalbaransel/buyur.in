export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "menuvaapp.com";

export function menuHost(slug: string): string {
  return `${slug}.${ROOT_DOMAIN}`;
}

export function menuUrl(slug: string): string {
  if (typeof window !== "undefined") {
    const { hostname, port, protocol } = window.location;
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return `${protocol}//${slug}.localhost${port ? `:${port}` : ""}`;
    }
  }
  return `https://${menuHost(slug)}`;
}

const WHATSAPP_NUMBER = "905357631908";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function planWhatsappLink(plan: string): string {
  return whatsappLink(
    `Merhaba! menuva "${plan}" planıyla ilgileniyorum. Detayları ve fiyatı öğrenebilir miyim?`
  );
}
