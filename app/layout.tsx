import type { Metadata, Viewport } from "next";
import { Open_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { OrganizationJsonLd } from "@/components/JsonLd";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const BASE_URL = "https://www.joneslegacycreations.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Jones Legacy Creations | Construction, Real Estate & Interior Design in Southern Utah",
    template: "%s | Jones Legacy Creations",
  },
  description: "Jones Legacy Creations offers custom home construction, real estate services, and professional interior design and staging in Hurricane and Southern Utah. Building legacies one project at a time.",
  keywords: ["construction", "real estate", "interior design", "home staging", "custom homes", "Southern Utah", "Hurricane Utah", "St. George", "residential construction", "commercial construction", "property services", "home builder", "Blake Jones Realty", "Interiors By Jones"],
  authors: [{ name: "Jones Legacy Creations" }],
  creator: "Jones Legacy Creations",
  publisher: "Jones Legacy Creations",
  openGraph: {
    title: "Jones Legacy Creations | Construction, Real Estate & Interior Design",
    description: "Custom home construction, real estate services, and interior design in Southern Utah. Three specialized brands under one roof.",
    url: BASE_URL,
    siteName: "Jones Legacy Creations",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jones Legacy Creations",
    description: "Custom home construction, real estate services, and interior design in Southern Utah.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${openSans.variable} ${playfair.variable} font-sans antialiased bg-white text-black`}
      >
        <OrganizationJsonLd />
        <GoogleAnalytics />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
