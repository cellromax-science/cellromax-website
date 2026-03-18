import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Cellromax Science";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logoPath = join(process.cwd(), "public/images/og/og-image.jpg");
  const logoData = await readFile(logoPath);
  const logoBase64 = `data:image/jpeg;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          alt="Cellromax Science"
          width={720}
          height={305}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
