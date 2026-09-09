import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapeo de controles para vulnerabilidades web",
  description:
    "Referencia educativa que relaciona vulnerabilidades web comunes con riesgos, controles de gobernanza y marcos como OWASP, NIST e ISO 27001.",
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
