"use client";

import { useState, type FormEvent } from "react";
import { pb } from "@/lib/pocketbase";
import { useToast } from "@/components/panel/toast";
import { Card, ErrorText, FormActions, Label } from "@/components/panel/ui";
import { ImageUploader } from "@/components/panel/image-uploader";
import { MultiLangFields } from "@/components/panel/multi-lang-fields";
import { activeLocales, mainLocale, type TranslatableField, type Translations } from "@/lib/i18n";
import type { Business, Popup } from "@/lib/types";

export function PopupForm({
  business,
  initial,
  onSaved,
  onCancel,
}: {
  business: Business;
  initial?: Popup;
  onSaved: (popup: Popup) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [translations, setTranslations] = useState<Translations>(initial?.translations ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  function setBaseField(field: TranslatableField, value: string) {
    if (field === "title") setTitle(value);
    else setMessage(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        business: business.id,
        title,
        message,
        image_url: imageUrl,
        is_active: isActive,
        translations,
      };
      const record = initial
        ? await pb.collection("buyur_popups").update<Popup>(initial.id, payload)
        : await pb.collection("buyur_popups").create<Popup>(payload);
      toast(initial ? "Kampanya güncellendi" : "Kampanya eklendi");
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormActions
          saving={saving}
          onCancel={onCancel}
          toggle={{ checked: isActive, onChange: setIsActive, label: "Aktif" }}
        />
        <ErrorText>{error}</ErrorText>

        {/* Üstte solda kare görsel */}
        <div className="w-32">
          <Label>Görsel (opsiyonel)</Label>
          <ImageUploader value={imageUrl} onChange={setImageUrl} businessId={business.id} kind="popup" aspect="aspect-square" />
        </div>
        {/* Başlık ve mesaj dil bazlı — ana dil baz alan, diğerleri çeviri */}
        <MultiLangFields
          locales={activeLocales(business)}
          mainLocale={mainLocale(business)}
          base={{ title, message }}
          onBaseChange={setBaseField}
          translations={translations}
          onTranslationsChange={setTranslations}
          fields={[
            { key: "title", label: "Başlık", required: true, placeholder: "Bu hafta sonuna özel!" },
            { key: "message", label: "Mesaj", multiline: true, rows: 3 },
          ]}
        />
      </form>
    </Card>
  );
}
