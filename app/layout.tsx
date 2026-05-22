import type { Metadata, Viewport } from "next";
import { Montserrat, League_Spartan } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { cn } from "@/lib/utils";

/* Brand fonts: League Spartan + Montserrat, per Jess. These match the
 * fonts she uses on the JLC physical signage. League Spartan is the
 * display face (big headlines, mono-caps eyebrows); Montserrat is body. */

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["system-ui", "arial"],
});

const leagueSpartan = League_Spartan({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700", "800"],
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JLC Admin",
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
  manifest: "/site.webmanifest",
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
    <html lang="en" className={cn("scroll-smooth", "font-sans", montserrat.variable)}>
      <body
        className={`${leagueSpartan.variable} font-sans antialiased`}
      >
        <OrganizationJsonLd />
        <GoogleAnalytics />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          });
        }
      `,
          }}
        />
        <Toaster />
      </body>
    </html>
  );
}
