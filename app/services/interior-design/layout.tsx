import type { Metadata } from "next";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Interior Design & Home Staging — Southern Utah",
  description:
    "Interiors By Jones — professional interior design, home staging, and color consultation in Hurricane and St. George, UT. Faster home sales with staging that works. Call (801) 735-7089.",
  keywords: [
    "interior designer Hurricane UT",
    "home staging St George UT",
    "Southern Utah interior design",
    "home staging Washington County",
    "Interiors By Jones",
  ],
  openGraph: {
    title: "Interior Design & Home Staging in Southern Utah | Interiors By Jones",
    description:
      "Professional interior design and home staging in Hurricane and St. George, UT. Faster sales, better photos, transformed spaces.",
    url: "https://www.joneslegacycreations.com/services/interior-design",
    type: "website",
    images: [
      {
        url: "/services-interior-design-og.jpg",
        width: 1200,
        height: 630,
        alt: "Interiors By Jones — interior design and home staging in Southern Utah",
      },
    ],
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
