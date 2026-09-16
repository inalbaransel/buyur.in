"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientResponseError } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { Button, ErrorText, Input, Label } from "@/components/panel/ui";
import { PLAN_LABELS } from "@/lib/entitlements";
import { parsePlanIntent, savePlanIntent, type IntentPlan } from "@/lib/plan-intent";
import { captureAttribution, trackMarketingEvent } from "@/lib/marketing-events";

const START_TITLES: Record<IntentPlan, string> = {
  premium: "Premium'u başlat",
  elite: "Elite'i başlat",
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<IntentPlan | null>(null);

  // Landing'deki "Premium'u başlat" buraya ?plan=premium ile gelir. Niyet
  // saklanır; hesap açılıp menü kurulunca ödeme adımı panelden başlatılır.
  // (useSearchParams yerine window: sayfa statik kalsın, Suspense gerekmesin.)
  useEffect(() => {
    captureAttribution();
    const parsed = parsePlanIntent(window.location.search);
    if (parsed) {
      savePlanIntent(parsed.plan, parsed.billing);
      setIntent(parsed.plan);
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }

    setLoading(true);
    try {
      await pb.collection("buyur_users").create({
        name,
        email,
        password,
        passwordConfirm: password,
      });
      await pb.collection("buyur_users").authWithPassword(email, password);
      trackMarketingEvent("signup_completed", { plan_intent: intent ?? "freemium" });
      router.replace("/panel");
    } catch (err) {
      if (err instanceof ClientResponseError && err.response?.data?.email) {
        setError("Bu e-posta zaten kayıtlı.");
      } else {
        setError("Kayıt oluşturulamadı, bilgileri kontrol edip tekrar dene.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-8">
      <h1 className="font-display text-xl font-bold">{intent ? START_TITLES[intent] : "Ücretsiz hesap aç"}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {intent
          ? `Önce hesabını aç ve menünü kur; ${PLAN_LABELS[intent]} geçişini panelden tek tıkla başlatırsın. Kredi kartı şimdi istenmez.`
          : "Kredi kartı gerekmez, 5 dakikada kurulur."}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Adın</Label>
          <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} className="w-full">
          Hesap oluştur
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Zaten hesabın var mı?{" "}
        <Link href="/panel/login" className="font-medium text-paprika hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
