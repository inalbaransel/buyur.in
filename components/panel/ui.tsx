import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { LockIcon } from "@/components/icons";
import { formatSavedTime } from "@/lib/format";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  const { className = "", ...rest } = props;
  return (
    <label
      className={`mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-soft ${className}`}
      {...rest}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-paprika ${className}`}
      {...rest}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      className={`w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-paprika ${className}`}
      {...rest}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      className={`w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-paprika ${className}`}
      {...rest}
    />
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  loading?: boolean;
}

export function Button({ variant = "primary", loading, className = "", disabled, children, ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 font-mono text-[13px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-ink text-paper hover:bg-paprika",
    outline: "border border-line text-ink hover:border-paprika hover:text-paprika",
    ghost: "text-ink-soft hover:text-paprika",
    danger: "border border-paprika/40 text-paprika hover:bg-paprika hover:text-paper",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? "..." : children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-line bg-paper p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Formun kayıt durumu: yayınlanmış son kayıt mı, yoksa yayınlanmamış yerel
 *  taslak mı daha yeni — kullanıcı neyin canlıda olduğunu her an bilsin. */
export function SaveStatus({
  saving,
  savedAt,
  draftSavedAt,
}: {
  saving?: boolean;
  /** Son başarılı kayıt (ms) ya da kaydın `updated` alanı. */
  savedAt?: number | string | null;
  draftSavedAt?: number | null;
}) {
  if (saving) return <span className="text-ink-soft">Kaydediliyor…</span>;
  const savedMs = typeof savedAt === "string" ? Date.parse(savedAt.replace(" ", "T")) : (savedAt ?? null);
  const hasSaved = savedMs !== null && Number.isFinite(savedMs);
  if (draftSavedAt && (!hasSaved || draftSavedAt > (savedMs as number))) {
    return <span className="text-ink-soft">Taslak kaydedildi · {formatSavedTime(draftSavedAt)} · henüz yayında değil</span>;
  }
  if (hasSaved) return <span className="text-herb">Son kaydedildi · {formatSavedTime(savedMs as number)}</span>;
  return null;
}

/** Önceki oturumdan kalmış, kaydedilmemiş taslak bildirimi. */
export function DraftBanner({ savedAt, onRestore, onDiscard }: { savedAt: number; onRestore: () => void; onDiscard: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-paprika/30 bg-paprika/5 px-4 py-3 text-sm">
      <p>
        <span className="font-semibold">Kaydedilmemiş bir taslağın var</span>
        <span className="text-ink-soft"> · {formatSavedTime(savedAt)}</span>
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDiscard}>
          Sil
        </Button>
        <Button type="button" onClick={onRestore}>
          Geri yükle
        </Button>
      </div>
    </div>
  );
}

// Formların sağ üstüne yerleşen kaydet/vazgeç çubuğu — kullanıcının kaydetmek
// için sayfayı en alta kaydırması gerekmez. `toggle` verilirse (ör. "Menüde
// Göster") kaydet butonunun hemen soluna kompakt bir switch olarak eklenir.
export function FormActions({
  saving,
  saved,
  status,
  onCancel,
  saveLabel = "Kaydet",
  cancelLabel = "Vazgeç",
  toggle,
}: {
  saving?: boolean;
  saved?: boolean;
  /** Serbest durum satırı (ör. <SaveStatus />); verilirse `saved` yerine gösterilir. */
  status?: ReactNode;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  toggle?: { checked: boolean; onChange: (checked: boolean) => void; label: string };
}) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-line pb-4">
      <span className="mr-auto font-mono text-[11px] uppercase tracking-wider text-herb">
        {status ?? (saved ? "Kaydedildi ✓" : "")}
      </span>
      {toggle && <Switch compact checked={toggle.checked} onChange={toggle.onChange} label={toggle.label} />}
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" loading={saving}>
        {saveLabel}
      </Button>
    </div>
  );
}

// Yatay sekme çubuğu — aktif sekmenin altında vurgu çizgisi (referans görsel gibi).
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-6 flex gap-6 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`relative -mb-px whitespace-nowrap border-b-2 pb-3 pt-1 text-[13px] font-semibold uppercase tracking-wide transition-colors ${
              isActive ? "border-paprika text-paprika" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Aç/kapa anahtarı (checkbox yerine). Sağda yeşil switch, solda etiket/açıklama.
// `compact` verilirse (ör. FormActions içinde kaydet butonunun yanında)
// açıklamasız, küçük, tek satırlık hâli kullanılır.
export function Switch({
  checked,
  onChange,
  label,
  description,
  compact,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <label className="flex shrink-0 cursor-pointer items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            checked ? "bg-herb" : "bg-ink/20"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-paper shadow transition-transform ${
              checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-herb" : "bg-ink/20"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-paper shadow transition-transform ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-paprika-deep">{children}</p>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
      {action}
    </div>
  );
}

// Bir özellik mevcut planda kapalıysa (PlanLimits) gösterilen kilitli-özellik kartı.
// EmptyState'ten farkı: "boş" değil "erişimin yok" mesajı verir, planını yükseltmesi
// için destek sayfasına yönlendirir (self-servis faturalandırma henüz yok).
export function UpgradeNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-paprika/40 bg-paprika/5 py-16 text-center">
      <LockIcon size={22} className="text-paprika" />
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      <Link
        href="/panel/support"
        className="mt-1 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 font-mono text-[13px] uppercase tracking-wider text-paper transition-colors hover:bg-paprika"
      >
        Planımı yükselt
      </Link>
    </div>
  );
}
