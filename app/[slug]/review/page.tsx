"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import { useMenu } from "@/components/menu/menu-provider";
import { CheckCircleIcon, StarIcon } from "@/components/icons";
import type { UIKey } from "@/lib/i18n";

function Stars({ value, onChange, t }: { value: number; onChange: (v: number) => void; t: (key: UIKey, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={t("starAria", { n })}
          className="transition-transform hover:scale-110"
          style={{ color: n <= value ? "var(--brand-text)" : "#d8cfc0" }}
        >
          <StarIcon size={30} filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { business, base, t, tf } = useMenu();
  const [firstVisit, setFirstVisit] = useState<boolean | null>(null);
  const [hygiene, setHygiene] = useState(0);
  const [satisfaction, setSatisfaction] = useState(0);
  const [revisit, setRevisit] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (hygiene === 0 && satisfaction === 0 && revisit === 0 && !comment.trim()) {
      setError(t("reviewMinOneError"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await pb.collection("buyur_reviews").create({
        business: business.id,
        is_first_visit: firstVisit === true,
        hygiene,
        satisfaction,
        revisit,
        comment: comment.trim(),
      });
      setDone(true);
    } catch {
      setError(t("reviewSendError"));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center px-5 py-20 text-center">
        <CheckCircleIcon size={56} style={{ color: "var(--brand-text)" }} />
        <h1 className="mt-4 font-display text-2xl font-extrabold">{t("thankYouTitle")}</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">{t("thankYouBody", { name: tf(business, "name") })}</p>
        {business.google_review_url && (
          <a
            href={business.google_review_url}
            target="_blank"
            rel="noreferrer"
            className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold shadow-lg transition-opacity hover:opacity-90"
            style={{ background: "var(--brand)", color: "var(--brand-on)" }}
          >
            <StarIcon size={18} filled />
            {t("googleReviewCta")}
          </a>
        )}
        <Link
          href={`${base}/menu`}
          className={`font-mono text-[13px] uppercase tracking-wider ${
            business.google_review_url ? "mt-4 text-ink-soft underline underline-offset-4" : "mt-8 rounded-full px-8 py-3"
          }`}
          style={
            business.google_review_url ? undefined : { background: "var(--brand)", color: "var(--brand-on)" }
          }
        >
          {t("backToMenu")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-10 pt-6">
      <h1 className="text-center font-display text-2xl font-extrabold">{t("reviewTitle")}</h1>

      <div className="rounded-xl border border-line p-5 text-center">
        <p className="font-display text-lg font-bold">{t("firstVisitQuestion")}</p>
        <div className="mt-3 flex justify-center gap-3">
          {[
            { label: t("yes"), value: true },
            { label: t("no"), value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setFirstVisit(opt.value)}
              className={`rounded-full border px-6 py-2 text-sm transition-colors ${
                firstVisit === opt.value ? "" : "border-line text-ink-soft hover:text-ink"
              }`}
              style={
                firstVisit === opt.value
                  ? { background: "var(--brand)", borderColor: "var(--brand)", color: "var(--brand-on)" }
                  : undefined
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line p-5 text-center">
        <p className="font-display text-lg font-bold">{t("hygieneQuestion")}</p>
        <div className="mt-3">
          <Stars value={hygiene} onChange={setHygiene} t={t} />
        </div>
      </div>

      <div className="rounded-xl border border-line p-5 text-center">
        <p className="font-display text-lg font-bold">{t("satisfactionQuestion")}</p>
        <div className="mt-3">
          <Stars value={satisfaction} onChange={setSatisfaction} t={t} />
        </div>
      </div>

      <div className="rounded-xl border border-line p-5 text-center">
        <p className="font-display text-lg font-bold">{t("revisitQuestion")}</p>
        <div className="mt-3">
          <Stars value={revisit} onChange={setRevisit} t={t} />
        </div>
      </div>

      <div className="rounded-xl border border-line p-5">
        <p className="font-display text-lg font-bold">{t("otherCommentsQuestion")}</p>
        <textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          className="mt-3 w-full rounded-lg border border-line bg-crema/40 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-[var(--brand)]"
        />
      </div>

      {error && <p className="text-center text-sm text-paprika">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl py-4 font-display text-lg font-bold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--brand)", color: "var(--brand-on)" }}
      >
        {saving ? t("sending") : t("send")}
      </button>

      {business.google_review_url && (
        <a
          href={business.google_review_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 pt-1 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          <StarIcon size={14} />
          {t("orGoogleReview")}
        </a>
      )}
    </form>
  );
}
