import { ImageResponse } from "next/og";
import { siteName } from "@/lib/site";

export const alt = "WVCM — referencia educativa de vulnerabilidades y controles web";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          color: "#f4f4f6",
          padding: "68px 76px",
          border: "1px solid #262629",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: "0.12em",
            color: "#a1a1aa",
          }}
        >
          <span>{siteName}</span>
          <span>REFERENCIA EDUCATIVA</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
            }}
          >
            <span>Web Vulnerability</span>
            <span>Control Mapping</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 27,
              color: "#a1a1aa",
              letterSpacing: "0.02em",
            }}
          >
            XSS · SQL Injection · Command Injection
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #3f3f46",
            paddingTop: 24,
            fontSize: 22,
            color: "#d4d4d8",
          }}
        >
          <span>OWASP · NIST · ISO/IEC 27001</span>
          <span>wvcm.vercel.app</span>
        </div>
      </div>
    ),
    size
  );
}
