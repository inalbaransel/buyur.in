// Web sitesi kendi kabuğunda: menü sayfalarının sepet/başlık bileşenlerini ve
// istemci sağlayıcılarını miras almaz — müşteriye gereksiz JavaScript inmez.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
