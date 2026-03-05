import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cellromax Science";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          background: "linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0a1628 100%)",
          position: "relative",
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage:
              "linear-gradient(rgba(197,165,90,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(197,165,90,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gold accent line top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, transparent, #c5a55a, transparent)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* Company name */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "12px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            CELLROMAX
          </div>
          {/* Divider */}
          <div
            style={{
              width: "120px",
              height: "2px",
              background: "#c5a55a",
            }}
          />
          <div
            style={{
              fontSize: "32px",
              fontWeight: 500,
              color: "#c5a55a",
              letterSpacing: "16px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            SCIENCE
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: "40px",
            fontSize: "18px",
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "4px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Premium Healthcare Solutions
        </div>

        {/* Gold accent line bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, transparent, #c5a55a, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
