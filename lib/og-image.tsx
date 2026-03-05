import { ImageResponse } from "next/og";

export function createOgImage({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
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
            gap: "20px",
          }}
        >
          {badge && (
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: "3px",
                background: "rgba(255,255,255,0.1)",
                padding: "8px 24px",
                borderRadius: "100px",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              {badge}
            </div>
          )}
          <div
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              lineHeight: 1.15,
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              width: "60px",
              height: "3px",
              background: "white",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "rgba(255,255,255,0.4)",
              marginTop: "16px",
            }}
          >
            joneslegacycreations.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
