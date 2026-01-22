import type { Metadata, Viewport } from "next";
import { Open_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ReCaptchaProvider } from "@/components/ReCaptchaProvider";

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

export const metadata: Metadata = {
  title: "Jones Legacy Creations | Construction, Real Estate & Interior Design",
  description: "Jones Legacy Creations offers comprehensive construction services, real estate solutions, and professional interior design and home staging. Building legacies one project at a time.",
  keywords: ["construction", "real estate", "interior design", "home staging", "residential construction", "commercial construction", "property services"],
  authors: [{ name: "Jones Legacy Creations" }],
  openGraph: {
    title: "Jones Legacy Creations",
    description: "Construction, Real Estate & Interior Design Services",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
        <GoogleAnalytics />
        <ReCaptchaProvider />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
