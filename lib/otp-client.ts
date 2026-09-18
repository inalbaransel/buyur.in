// OTP sabitleri — hem sunucu (lib/otp.ts) hem kayıt ekranı okur. node:crypto
// gibi sunucuya özel bir bağımlılık taşımaz ki client component'e girebilsin.

export const OTP_LENGTH = 6;
/** Kodun geçerlilik süresi. Kullanıcının maili bulup girmesine yetecek kadar
 *  uzun, çalınan bir kodun işe yaramasına yetmeyecek kadar kısa. */
export const OTP_TTL_MINUTES = 10;
/** Yanlış kod denemesi üst sınırı — üstünde kayıt silinir, baştan istenir. */
export const OTP_MAX_ATTEMPTS = 5;
/** İki kod isteği arasındaki en kısa süre. */
export const OTP_RESEND_SECONDS = 60;
