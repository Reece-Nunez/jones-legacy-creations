import type { Metadata } from "next";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Custom Home Construction & Renovations",
  description: "Jones Custom Homes builds quality custom homes and renovations in Southern Utah. View completed projects in Hurricane and Hatch, UT. Licensed, insured, and dedicated to on-time, on-budget delivery.",
  openGraph: {
    title: "Custom Home Construction | Jones Custom Homes",
    description: "Expert custom home construction, residential renovations, and commercial projects in Southern Utah. View our completed builds.",
    url: "https://www.joneslegacycreations.com/services/construction",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/services/construction",
  },
};

export default function ConstructionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceJsonLd
        name="Custom Home Construction"
        description="Residential and commercial construction, custom homes, renovations, and project management in Hurricane and Southern Utah."
        provider="Jones Custom Homes"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.joneslegacycreations.com" },
          { name: "Services", url: "https://www.joneslegacycreations.com" },
          { name: "Construction", url: "https://www.joneslegacycreations.com/services/construction" },
        ]}
      />
      {children}
    </>
  );
}
