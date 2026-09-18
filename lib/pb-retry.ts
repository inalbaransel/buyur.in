// PocketBase yazma turlarının DAYANIKLILIĞI.
//
// Menü aktarımı gibi toplu işlemler onlarca kaydı arka arkaya yazar. Hepsi aynı
// anda gönderilince sunucu ani yükü kaldıramaz ve 503 döner: kullanıcı 25 üründen
// 1'i eklenmiş bir menüyle baş başa kalır. Çözüm iki parçalı — istekleri kuyruğa
// alıp eşzamanlılığı sınırlamak, geçici hataları sessizce yeniden denemek.
//
// Saf modül: PocketBase istemcisini bilmez, yalnızca "söz üreten" işleri sürer.
// Sözleşmesi tests/pb-retry.test.ts içinde yazılıdır.

/** Geçici (yeniden denemeye değer) sunucu durumları. 4xx kalıcıdır: aynı veriyi
 *  tekrar göndermek sonucu değiştirmez, yalnızca sunucuyu daha çok yorar.
 *  0 = ağ kesintisi / CORS öncesi kopma. */
const RETRYABLE_STATUS = new Set([0, 408, 429, 500, 502, 503, 504]);

export function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  // Durum kodu okunamayan hata (ör. fetch TypeError) ağ kaynaklı sayılır.
  if (typeof status !== "number") return true;
  return RETRYABLE_STATUS.has(status);
}

export interface RetryOptions {
  /** Toplam deneme sayısı (ilk deneme dâhil). */
  attempts?: number;
  /** İlk bekleme süresi (ms); her denemede ikiye katlanır. */
  baseDelayMs?: number;
  /** Üst sınır — uzun aktarımlarda bekleme patlamasın. */
  maxDelayMs?: number;
  /** Test edilebilirlik için bekleme fonksiyonu. */
  sleep?: (ms: number) => Promise<void>;
  /** Test edilebilirlik için sarsıntı (0–1). */
  jitter?: () => number;
}

export interface WriteRetryOptions<T> extends RetryOptions {
  /** Yazma isteği hata verdikten SONRA "kayıt yine de oluştu mu?" diye bakar.
   *  Bir kayıt döndürürse iş başarılı sayılır ve tekrar yazılmaz. */
  verify?: () => Promise<T | null | undefined>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Geçici hatalarda üstel geri çekilmeyle yeniden dener.
 *  Kalıcı hatada (4xx) ilk denemede olduğu gibi fırlatır.
 *
 *  `verify` verilirse yazma işleri için ÇİFT KAYIT KORUMASI devreye girer:
 *  503 gibi bir hata, isteğin sunucuya hiç ulaşmadığı anlamına gelmez — kayıt
 *  yazılmış ama yanıt yolda kaybolmuş olabilir. Körlemesine tekrar denemek
 *  aynı ürünü ikinci kez oluşturur. Bu yüzden her tekrardan önce kaydın
 *  gerçekten oluşup oluşmadığına bakılır. */
export async function withRetry<T>(task: () => Promise<T>, options: WriteRetryOptions<T> = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const sleep = options.sleep ?? defaultSleep;
  const jitter = options.jitter ?? Math.random;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) throw error;

      // Hata geçici: kayıt sessizce yazılmış olabilir mi? Yazılmışsa iş bitmiştir.
      if (options.verify) {
        try {
          const existing = await options.verify();
          if (existing) return existing;
        } catch {
          // Doğrulama da okunamadı; normal tekrar akışına düşülür.
        }
      }

      if (attempt === attempts - 1) throw error;
      // Sarsıntı: eşzamanlı işler aynı anda uyanıp sunucuyu yeniden dövmesin.
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await sleep(delay * (0.5 + jitter() * 0.5));
    }
  }
  throw lastError;
}

export interface PooledResult<T, R> {
  item: T;
  index: number;
  value?: R;
  error?: unknown;
}

export interface PoolOptions<T, R> extends RetryOptions {
  /** Aynı anda kaç istek uçsun. Küçük tutulur: sunucuyu boğmak 503 demektir. */
  concurrency?: number;
  /** Her iş bittiğinde (başarılı ya da değil) çağrılır. */
  onSettled?: (result: PooledResult<T, R>) => void;
}

/** İşleri sınırlı eşzamanlılıkla sürer ve HİÇBİRİNİ yarıda bırakmaz:
 *  bir iş başarısız olsa da kalanlar denenir, sonuç listesi tek tek raporlanır.
 *  (Promise.all'ın aksine — orada ilk hata kalan işleri görünmez kılıyordu.) */
export async function runPooled<T, R>(
  items: T[],
  task: (item: T, index: number) => Promise<R>,
  options: PoolOptions<T, R> = {}
): Promise<PooledResult<T, R>[]> {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const results: PooledResult<T, R>[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      let result: PooledResult<T, R>;
      try {
        result = { item, index, value: await withRetry(() => task(item, index), options) };
      } catch (error) {
        result = { item, index, error };
      }
      results[index] = result;
      options.onSettled?.(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
