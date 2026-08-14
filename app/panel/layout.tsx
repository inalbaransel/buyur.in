import type { Metadata } from "next";

// Panel işletme sahiplerine özel yönetim alanı — arama motorlarına kapalı.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
