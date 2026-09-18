"use client";

import { useMemo, useState, type FormEvent } from "react";
import { pb } from "@/lib/pocketbase";
import { useToast } from "@/components/panel/toast";
import { Card, DraftBanner, ErrorText, FormActions, Label, SaveStatus } from "@/components/panel/ui";
import { ImageUploader } from "@/components/panel/image-uploader";
import { MultiLangFields } from "@/components/panel/multi-lang-fields";
import { AiTranslateButton } from "@/components/panel/ai/translate-button";
import { useFormDraft } from "@/lib/use-draft";
import { activeLocales, mainLocale, type TranslatableField, type Translations } from "@/lib/i18n";
import type { Business, Category } from "@/lib/types";

interface CategoryDraft {
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  translations: Translations;
}

function toDraft(initial?: Category): CategoryDraft {
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.image_url ?? "",
    isActive: initial?.is_active ?? true,
    translations: initial?.translations ?? {},
  };
}

export function CategoryForm({
  business,
  initial,
  order,
  onSaved,
  onCancel,
}: {
  business: Business;
  initial?: Category;
  order?: number;
  onSaved: (category: Category) => void;
  onCancel?: () => void;
}) {
  const baseline = useMemo(
    () => toDraft(initial),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial?.id, initial?.updated]
  );

  const [name, setName] = useState(baseline.name);
  const [description, setDescription] = useState(baseline.description);
  const [imageUrl, setImageUrl] = useState(baseline.imageUrl);
  const [isActive, setIsActive] = useState(baseline.isActive);
  const [translations, setTranslations] = useState<Translations>(baseline.translations);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const { toast } = useToast();

  const draft = useFormDraft(
    `category:${initial?.id ?? `new:${business.id}`}`,
    { name, description, imageUrl, isActive, translations },
    baseline,
    initial?.updated
  );

  function applyDraft(value: CategoryDraft) {
    setName(value.name);
    setDescription(value.description);
    setImageUrl(value.imageUrl);
    setIsActive(value.isActive);
    setTranslations(value.translations);
  }

  function setBaseField(field: TranslatableField, value: string) {
    if (field === "name") setName(value);
    else setDescription(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { name, description, image_url: imageUrl, is_active: isActive, translations };
      const record = initial
        ? await pb.collection("buyur_categories").update<Category>(initial.id, payload)
        : await pb.collection("buyur_categories").create<Category>({ ...payload, business: business.id, order: order ?? 0 });
      draft.clear();
      setLastSavedAt(Date.now());
      toast(initial ? "Kategori güncellendi" : "Kategori eklendi");
      onSaved(record);
    } catch {
      setError("Kaydedilemedi, tekrar dene.");
      toast("Kaydedilemedi, tekrar dene.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormActions
          saving={saving}
          onCancel={onCancel}
          status={<SaveStatus saving={saving} savedAt={lastSavedAt ?? initial?.updated ?? null} draftSavedAt={draft.draftSavedAt} />}
          toggle={{ checked: isActive, onChange: setIsActive, label: "Menüde Göster" }}
          extra={
            <AiTranslateButton
              business={business}
              kind="category"
              fields={{ name, description }}
              translations={translations}
              onTranslationsChange={setTranslations}
            />
          }
        />
        {draft.restorable && (
          <DraftBanner
            savedAt={draft.restorable.savedAt}
            onRestore={() => {
              if (draft.restorable) applyDraft(draft.restorable.value);
              draft.dismiss();
            }}
            onDiscard={draft.discard}
          />
        )}
        <ErrorText>{error}</ErrorText>

        {/* Üstte solda kare görsel */}
        <div className="w-32">
          <Label>Kategori görseli</Label>
          <ImageUploader value={imageUrl} onChange={setImageUrl} businessId={business.id} kind="category" name={name} aspect="aspect-square" />
        </div>

        {/* Altında dil sekmeleri — ana dil ilk sırada ve açık */}
        <MultiLangFields
          locales={activeLocales(business)}
          mainLocale={mainLocale(business)}
          base={{ name, description }}
          onBaseChange={setBaseField}
          translations={translations}
          onTranslationsChange={setTranslations}
          fields={[
            { key: "name", label: "Kategori adı", required: true, placeholder: "Ana Yemekler" },
            { key: "description", label: "Açıklama", multiline: true },
          ]}
        />
      </form>
    </Card>
  );
}
