import { describe, expect, it } from "vitest";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  OTP_TTL_MINUTES,
  canResendOtp,
  generateOtpCode,
  hashOtpCode,
  isOtpExpired,
  isValidEmail,
  isValidOtpCode,
  matchesOtpHash,
  normalizeEmail,
  otpExpiresAt,
  parsePbDate,
} from "@/lib/otp";

// Kayıt doğrulama kodunun yazılı sözleşmesi. Süre/deneme sayısı ürün kararıdır;
// değişiyorsa önce bu test değişir.
describe("OTP kuralları", () => {
  it("kod her zaman 6 haneli ve sıfırla başlayabilir", () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(isValidOtpCode(code)).toBe(true);
    }
  });

  it("kodu düz metin değil, e-postayla birlikte özetleyerek saklar", () => {
    const code = "123456";
    const hash = hashOtpCode("Ali@Buyur.in", code);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(code);
    // Aynı kod, başka bir adres için geçersiz olmalı.
    expect(hashOtpCode("veli@buyur.in", code)).not.toBe(hash);
    // E-posta büyük/küçük harf farkı kodu bozmaz.
    expect(hashOtpCode("ali@buyur.in", code)).toBe(hash);
  });

  it("özetleri sabit zamanlı karşılaştırır, uzunluk farkında patlamaz", () => {
    const hash = hashOtpCode("ali@buyur.in", "123456");
    expect(matchesOtpHash(hash, hashOtpCode("ali@buyur.in", "123456"))).toBe(true);
    expect(matchesOtpHash(hash, hashOtpCode("ali@buyur.in", "123457"))).toBe(false);
    expect(matchesOtpHash(hash, "kisa")).toBe(false);
  });

  it("e-postayı karşılaştırma için tek biçime indirger", () => {
    expect(normalizeEmail("  Ali@Buyur.IN ")).toBe("ali@buyur.in");
    expect(isValidEmail("ali@buyur.in")).toBe(true);
    expect(isValidEmail("ali@buyur")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });

  it("6 hane dışındaki her şeyi kod saymaz", () => {
    expect(isValidOtpCode("12345")).toBe(false);
    expect(isValidOtpCode("1234567")).toBe(false);
    expect(isValidOtpCode("12a456")).toBe(false);
    expect(isValidOtpCode(123456)).toBe(false);
  });

  it("kod 10 dakika geçerli; sınırda ve sonrasında ölür", () => {
    expect(OTP_TTL_MINUTES).toBe(10);
    const now = new Date("2026-09-18T10:00:00.000Z");
    const expires = otpExpiresAt(now);
    expect(isOtpExpired(expires, new Date("2026-09-18T10:09:59.000Z"))).toBe(false);
    expect(isOtpExpired(expires, new Date("2026-09-18T10:10:00.000Z"))).toBe(true);
  });

  it("PocketBase'in boşluklu tarih biçimini de okur", () => {
    expect(parsePbDate("2026-09-18 10:10:00.000Z")?.toISOString()).toBe("2026-09-18T10:10:00.000Z");
    expect(parsePbDate("2026-09-18T10:10:00.000Z")?.toISOString()).toBe("2026-09-18T10:10:00.000Z");
    expect(parsePbDate("")).toBeNull();
    expect(parsePbDate(null)).toBeNull();
  });

  it("okunamayan son kullanma tarihini süresi dolmuş sayar", () => {
    // Belirsiz bir kodu geçerli saymaktansa kullanıcıdan yenisini istemek yeğdir.
    expect(isOtpExpired("bozuk-tarih")).toBe(true);
    expect(isOtpExpired(undefined)).toBe(true);
  });

  it("yeni kod için 60 saniye bekletir", () => {
    expect(OTP_RESEND_SECONDS).toBe(60);
    const created = "2026-09-18 10:00:00.000Z";
    expect(canResendOtp(created, new Date("2026-09-18T10:00:30.000Z"))).toBe(false);
    expect(canResendOtp(created, new Date("2026-09-18T10:01:00.000Z"))).toBe(true);
  });

  it("oluşturma tarihi okunamazsa gönderime izin verir", () => {
    // Altyapı hatasında kısıtlama değil serbestlik: kullanıcı kayıt akışının
    // dışında kalmamalı.
    expect(canResendOtp("")).toBe(true);
    expect(canResendOtp(undefined)).toBe(true);
  });

  it("yanlış deneme hakkını 5'te keser", () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });
});
