import type { Metadata } from "next";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Real Estate Services in Southern Utah",
  description: "Blake Jones Realty offers expert real estate services across Southern Utah. Buy, sell, or invest in properties in Hurricane, St. George, Washington, Ivins, Cedar City, and beyond.",
  openGraph: {
    title: "Real Estate Services | Blake Jones Realty",
    description: "Expert real estate services across Southern Utah. Buy, sell, or invest with experienced local guidance in Hurricane, St. George, and beyond.",
    url: "https://www.joneslegacycreations.com/services/real-estate",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/services/real-estate",
  },
};

export default function RealEstateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceJsonLd
        name="Real Estate Services"
        description="Property search, market analysis, buyer and seller representation across Hurricane, St. George, and Southern Utah."
        provider="Blake Jones Realty"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.joneslegacycreations.com" },
          { name: "Services", url: "https://www.joneslegacycreations.com" },
          { name: "Real Estate", url: "https://www.joneslegacycreations.com/services/real-estate" },
        ]}
      />
      {children}
    </>
  );
}
