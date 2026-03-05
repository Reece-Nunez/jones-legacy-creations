import type { Metadata } from "next";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Interior Design & Home Staging",
  description: "Professional interior design and home staging by Interiors By Jones. Space planning, color consultation, furniture selection, and staging services in Southern Utah. Call (801) 735-7089.",
  openGraph: {
    title: "Interior Design & Home Staging | Interiors By Jones",
    description: "Transform your space or prepare to sell with expert interior design and home staging in Southern Utah.",
    url: "https://www.joneslegacycreations.com/services/interior-design",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/services/interior-design",
  },
};

export default function InteriorDesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceJsonLd
        name="Interior Design & Home Staging"
        description="Professional interior design, home staging, space planning, color consultation, and furniture selection in Southern Utah."
        provider="Interiors By Jones"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.joneslegacycreations.com" },
          { name: "Services", url: "https://www.joneslegacycreations.com" },
          { name: "Interior Design", url: "https://www.joneslegacycreations.com/services/interior-design" },
        ]}
      />
      {children}
    </>
  );
}
