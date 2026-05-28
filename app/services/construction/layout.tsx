import type { Metadata } from "next";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  // Title targets "custom home builder" + locality intent — both
  // primary keywords for someone searching for a Hurricane/St. George
  // builder. Length kept under 60 chars so Google doesn't truncate it.
  title: "Custom Home Builder in Hurricane & St. George, UT",
  description:
    "Jones Custom Homes builds custom homes, renovations, and commercial projects across Hurricane, St. George, and Southern Utah. Licensed, insured, on-time delivery. Request a free estimate.",
  keywords: [
    "custom home builder Hurricane UT",
    "custom home builder St George UT",
    "custom homes Southern Utah",
    "home renovation Hurricane",
    "Washington County builder",
    "Jones Custom Homes",
  ],
  openGraph: {
    title: "Custom Home Builder in Hurricane & St. George, UT | Jones Custom Homes",
    description:
      "Licensed custom home builder serving Hurricane, St. George, and Southern Utah. View completed projects, request a free estimate.",
    url: "https://www.joneslegacycreations.com/services/construction",
    type: "website",
    images: [
      {
        url: "/services-construction-og.jpg",
        width: 1200,
        height: 630,
        alt: "Jones Custom Homes — custom home construction in Hurricane, UT",
      },
    ],
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
