"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** Görsel inene kadar şeffaf durur, sonra yumuşakça belirir: kutuya bir anda
 *  "düşen" görsel yerine yüzeyin tonu görünür. Önbellekteki görsel
 *  (`complete`) beklemeden görünür — gereksiz solma olmaz. */
export function FadeImg({ className = "", onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setReady(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      {...props}
      onLoad={(e) => {
        setReady(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        // Kırık görselde de görünür kal; üst bileşen kendi yedeğini yönetir.
        setReady(true);
        onError?.(e);
      }}
      className={`${className} transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
    />
  );
}
