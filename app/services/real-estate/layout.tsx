import type { Metadata } from "next";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Real Estate Agent in Hurricane & St. George, UT",
  description:
    "Blake Jones Realty — buy, sell, or invest in Hurricane, St. George, Washington, Ivins, Cedar City. Local Southern Utah real estate expertise. Get current listings + market analysis.",
  keywords: [
    "real estate Hurricane UT",
    "real estate St George UT",
    "Southern Utah homes for sale",
    "Hurricane realtor",
    "Washington County real estate",
    "Blake Jones Realty",
  ],
  openGraph: {
    title: "Real Estate Agent in Hurricane & St. George, UT | Blake Jones Realty",
    description:
      "Buy, sell, or invest in Southern Utah real estate with local expertise. Hurricane, St. George, Washington, Ivins, Cedar City.",
    url: "https://www.joneslegacycreations.com/services/real-estate",
    type: "website",
    images: [
      {
        url: "/services-real-estate-og.jpg",
        width: 1200,
        height: 630,
        alt: "Blake Jones Realty — Southern Utah real estate",
      },
    ],
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
