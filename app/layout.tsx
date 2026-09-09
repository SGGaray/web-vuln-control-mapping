import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n/context";
import {
  siteDescription,
  siteName,
  siteTitle,
  siteUrl,
  socialTitle,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: socialTitle,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "WVCM — referencia educativa de vulnerabilidades y controles web",
      },
    ],
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
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
