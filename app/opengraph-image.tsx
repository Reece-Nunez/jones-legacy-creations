import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Jones Legacy Creations - Construction, Real Estate & Interior Design in Southern Utah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #18181b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            Jones Legacy Creations
          </div>
          <div
            style={{
              width: "80px",
              height: "4px",
              background: "white",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              fontSize: "28px",
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            Construction &bull; Real Estate &bull; Interior Design
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            Building Legacies in Southern Utah
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
