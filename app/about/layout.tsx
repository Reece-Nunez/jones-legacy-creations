import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About Us | Blake & Hilari Jones",
  description: "Meet Blake and Hilari Jones — your one-stop shop for custom home building, real estate, and interior design in Southern Utah. Creative financing, industry connections, and a patient approach.",
  openGraph: {
    title: "About Jones Legacy Creations",
    description: "Meet the team behind Jones Legacy Creations. Custom home building, real estate, and interior design under one roof in Southern Utah.",
    url: "https://www.joneslegacycreations.com/about",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.joneslegacycreations.com" },
          { name: "About", url: "https://www.joneslegacycreations.com/about" },
        ]}
      />
      {children}
    </>
  );
}
