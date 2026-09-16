"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { Button, ErrorText, Input, Label } from "@/components/panel/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await pb.collection("buyur_users").authWithPassword(email, password);
      router.replace("/panel");
    } catch {
      setError("E-posta veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-8">
      <h1 className="font-display text-xl font-bold">Panele giriş yap</h1>
      <p className="mt-1 text-sm text-ink-soft">Menünü yönetmek için giriş yap.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} className="w-full">
          Giriş yap
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Hesabın yok mu?{" "}
        <Link href="/panel/register" className="font-medium text-paprika hover:underline">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
