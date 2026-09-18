"use client";

import { useEffect } from "react";

// Aynı anda birden çok pencere açılabilir (kontrol penceresi + "kapatalım mı?"
// onayı gibi). Her pencere gövdenin "önceki" değerini kendi içinde saklarsa,
// kapanış sırası ya da yeniden render yüzünden "hidden" kalıcı olarak geri
// yazılır ve panel bir daha kaymaz. Bu yüzden tek sayaç + tek orijinal değer var:
// son kilit kalktığında gövde ilk hâline döner.
let lockCount = 0;
let originalOverflow = "";

/** Gövde kaydırmasını kilitler; dönen fonksiyon kilidi (tek seferlik) kaldırır. */
export function lockBodyScroll(): () => void {
  if (lockCount === 0) originalOverflow = document.body.style.overflow;
  lockCount += 1;
  document.body.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) document.body.style.overflow = originalOverflow;
  };
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => (active ? lockBodyScroll() : undefined), [active]);
}
