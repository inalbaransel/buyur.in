import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "menuva — Dijital QR Menü";

const LOGO_RATIO = 831 / 723;

export default function Image() {
  const logoBuf = readFileSync(join(process.cwd(), "public/menuva-logo-og.png"));
  const logo = `data:image/png;base64,${logoBuf.toString("base64")}`;
  const logoHeight = 300;
  const logoWidth = Math.round(logoHeight * LOGO_RATIO);

  const bar = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: 10,
    display: "flex" as const,
    backgroundImage: "linear-gradient(90deg, #fbf5ea 0%, #e8491f 50%, #fbf5ea 100%)",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fbf5ea",
          backgroundImage: "linear-gradient(135deg, #fbf5ea 0%, #f4ead9 100%)",
          position: "relative",
        }}
      >
        <div style={{ ...bar, top: 0 }} />
        <img src={logo} width={logoWidth} height={logoHeight} style={{ display: "flex" }} />
        <div
          style={{
            display: "flex",
            marginTop: 30,
            fontSize: 34,
            color: "#5c4a3d",
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          Menünüzü dakikalar içinde dijitalleştirin
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 34,
            padding: "10px 24px",
            borderRadius: 999,
            border: "2px solid #e8491f",
            fontSize: 22,
            letterSpacing: 2,
            color: "#e8491f",
          }}
        >
          QR MENÜ · MENUVA
        </div>
        <div style={{ ...bar, bottom: 0 }} />
      </div>
    ),
    { ...size }
  );
}
