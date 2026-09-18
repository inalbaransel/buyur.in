# buyur Agent Takımı

Üç ajan, üç sorumluluk. Her biri kendi alanının pazarlık edilemez kurallarını
taşır; adım adım iş akışları [`../skills/`](../skills/) klasöründedir.

| Ajan | Sorumluluk | Alan |
|---|---|---|
| **frontend** | Kullanıcının gördüğü her şey | `app/[slug]/**`, `app/panel/**`, `app/site/**`, `components/**`, `globals.css`, SEO |
| **backend** | Veri, güvenlik, iş kuralı | `lib/**`, `app/api/**`, `middleware.ts`, `scripts/**`, analitik, AI, entitlements |
| **quality** | Denetim ve sözleşme | `git diff` denetimi + `tests/**` |

## Kullanım

```
frontend ajanıyla sepet ekranındaki fiyat hizalamasını düzelt
backend ajanıyla AI tarama ucuna kota kontrolü ekle
quality ajanıyla son değişikliği denetle
```

## Tipik akış

```
backend (veri + kural)  →  frontend (ekran)  →  quality (denetim + test)
```

- **Yeni panel özelliği:** backend (alan/şema + plan kilidi) → frontend (ekran) → quality
- **Menü hatası:** frontend (kök neden) → backend (veri katmanıysa) → quality (regresyon testi)
- **Yanlış metrik:** backend (rollup/sorgu) → quality (sözleşme testi) → frontend (gösterim)
- **AI özelliği:** backend (uç nokta + kota) → frontend (önizleme/onay ekranı) → quality

## Devralınan ortak sınırlar

1. Gizli anahtar istemciye çıkmaz, sahiplik kontrolü atlanmaz
2. Plan kararı `lib/entitlements.ts`, metin okuma `tField`, filtre `pb.filter()`
3. Kullanıcıya görünen her metin Türkçe
4. `bun run test` ve `bun run build` yeşil olmadan iş bitmiş sayılmaz

## Skill'ler

| Skill | Ne zaman |
|---|---|
| `buyur-panel-sayfasi` | Panele yeni ekran/form |
| `buyur-veri-modeli` | Yeni alan, göç, API ucu |
| `buyur-analitik-event` | Yeni event, metrik, rapor |
| `buyur-plan-kilidi` | Özellik kilidi, limit |
| `buyur-cok-dilli-icerik` | Çevrilebilir alan, RTL |
| `buyur-ai-akisi` | AI akışı, menü tarama |
| `buyur-yayin-oncesi` | Commit / PR öncesi tur |

Proje geneli kurallar: [`../../CLAUDE.md`](../../CLAUDE.md)
