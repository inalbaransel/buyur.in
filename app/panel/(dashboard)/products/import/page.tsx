import { redirect } from "next/navigation";

// Menü içe aktarma Yapay Zeka sayfasına taşındı (/panel/ai). Eski bağlantılar,
// yer imleri ve ürün sayfasındaki "Yapay Zeka ile Tara" kısayolu kırılmasın
// diye yönlendirme bırakıldı.
export default function ImportRedirectPage() {
  redirect("/panel/ai");
}
