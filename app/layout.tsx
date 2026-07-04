import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Attack Payload Reference",
  description:
    "Educational reference of web vulnerabilities mapped to risk, controls, and frameworks (OWASP, NIST, ISO 27001).",
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
