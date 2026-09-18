// Brevo (transactional e-posta) istemcisi. Yalnızca sunucuda çalışır —
// BREVO_API_KEY hiçbir koşulda NEXT_PUBLIC_ ile tanımlanmaz.
//
// Şablonlar marka token'larının e-posta karşılığıdır: e-posta istemcileri CSS
// değişkeni ve harici font yüklemediği için renkler satır içi hex, yazı tipleri
// sistem yığınıdır. Değer değişirse app/globals.css ile elle eşitlenmeli.

import { ROOT_DOMAIN, menuHost } from "@/lib/site";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? `noreply@${ROOT_DOMAIN}`;
const SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "buyur";

// Marka renkleri (app/globals.css @theme karşılıkları)
const PAPER = "#fbf5ea";
const CREMA = "#f4ead9";
const INK = "#231812";
const INK_SOFT = "#6b5a4e";
const PAPRIKA = "#e8491f";
const LINE = "#e0d3bf";

/** Brevo anahtarı iki biçimde gelebilir: ham `xkeysib-...` ya da MCP panelinin
 *  verdiği base64 JSON sarmalı. İkincisini burada açıyoruz ki yanlış biçim
 *  yüzünden sessiz 401 almayalım. */
function readApiKey(): string | null {
  const raw = process.env.BREVO_API_KEY?.trim();
  if (!raw) return null;
  if (raw.startsWith("xkeysib-")) return raw;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (typeof decoded?.api_key === "string") return decoded.api_key;
  } catch {
    // base64/JSON değilse ham değeri olduğu gibi deneriz.
  }
  return raw;
}

export function isEmailConfigured(): boolean {
  return readApiKey() !== null;
}

interface SendArgs {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, toName, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = readApiKey();
  if (!apiKey) throw new Error("BREVO_API_KEY tanımlı değil.");

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [toName ? { email: to, name: toName } : { email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${detail.slice(0, 300)}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tüm e-postaların ortak kabuğu: kâğıt zemin, ortalanmış kart, buyur başlığı. */
function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:20px;">
          <span style="font-family:'Trebuchet MS',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:${PAPRIKA};">buyur</span>
        </td></tr>
        <tr><td style="background:${CREMA};border:1px solid ${LINE};border-radius:20px;padding:32px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
${body}
        </td></tr>
        <tr><td style="padding-top:20px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${INK_SOFT};">
          Bu e-posta ${escapeHtml(ROOT_DOMAIN)} tarafından gönderildi.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Kayıt doğrulama kodu. */
export async function sendOtpEmail(to: string, name: string, code: string, ttlMinutes: number): Promise<void> {
  const greeting = name.trim() ? `Merhaba ${escapeHtml(name.trim())},` : "Merhaba,";
  const html = shell(
    "buyur doğrulama kodun",
    `<h1 style="margin:0 0 12px;font-size:20px;font-weight:700;letter-spacing:-0.01em;">Doğrulama kodun</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${INK_SOFT};">${greeting} hesabını açmak için aşağıdaki kodu kayıt ekranına gir.</p>
<div style="background:${PAPER};border:1px solid ${LINE};border-radius:16px;padding:20px;text-align:center;">
  <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${INK};">${escapeHtml(code)}</span>
</div>
<p style="margin:20px 0 0;font-size:13px;line-height:1.65;color:${INK_SOFT};">Kod ${ttlMinutes} dakika geçerli. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>`
  );

  await send({
    to,
    toName: name || undefined,
    subject: `buyur doğrulama kodun: ${code}`,
    html,
    text: `Doğrulama kodun: ${code}\nKod ${ttlMinutes} dakika geçerli.\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`,
  });
}

interface WelcomeArgs {
  userName: string;
  businessName: string;
  slug: string;
}

/** İşletme kurulduktan sonraki karşılama maili. */
export async function sendWelcomeEmail(to: string, { userName, businessName, slug }: WelcomeArgs): Promise<void> {
  const url = `https://${menuHost(slug)}`;
  const greeting = userName.trim() ? `Merhaba ${escapeHtml(userName.trim())},` : "Merhaba,";
  const html = shell(
    `Aramıza hoş geldin, ${businessName}!`,
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;letter-spacing:-0.01em;">Aramıza hoş geldin, ${escapeHtml(businessName)}!</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${INK_SOFT};">${greeting} dijital menün yayında. QR kodunu masalara koyduğun an müşterilerin menünü telefonlarından görebilir.</p>
<div style="background:${PAPER};border:1px solid ${LINE};border-radius:16px;padding:18px;margin-bottom:24px;">
  <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${INK_SOFT};margin-bottom:6px;">Menü adresin</div>
  <a href="${escapeHtml(url)}" style="font-size:16px;font-weight:700;color:${PAPRIKA};text-decoration:none;">${escapeHtml(menuHost(slug))}</a>
</div>
<div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${INK_SOFT};margin-bottom:10px;">Sıradaki üç adım</div>
<ol style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.85;color:${INK};">
  <li>Ürünlerini ve fiyatlarını ekle</li>
  <li>Logonu ve marka rengini ayarla</li>
  <li>QR kodunu indirip masalara yerleştir</li>
</ol>
<a href="https://${escapeHtml(ROOT_DOMAIN)}/panel" style="display:inline-block;background:${PAPRIKA};color:#ffffff;font-family:'Courier New',monospace;font-size:13px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 26px;border-radius:8px;">Panele git</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.65;color:${INK_SOFT};">Takıldığın bir yer olursa bu e-postayı yanıtlaman yeterli.</p>`
  );

  await send({
    to,
    toName: userName || undefined,
    subject: `Aramıza hoş geldin, ${businessName}!`,
    html,
    text: `Aramıza hoş geldin, ${businessName}!\n\nDijital menün yayında: ${url}\n\nSıradaki adımlar:\n1. Ürünlerini ve fiyatlarını ekle\n2. Logonu ve marka rengini ayarla\n3. QR kodunu indirip masalara yerleştir\n\nPanel: https://${ROOT_DOMAIN}/panel`,
  });
}
