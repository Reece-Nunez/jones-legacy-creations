import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Interior Design Portfolio Gallery",
  description: "Browse our interior design portfolio featuring kitchens, bedrooms, living rooms, and bathrooms. See the quality and style of Interiors By Jones across Southern Utah projects.",
  openGraph: {
    title: "Interior Design Portfolio | Interiors By Jones",
    description: "Explore beautiful kitchen designs, bedroom styling, living room transformations, and bathroom projects from across our work.",
    url: "https://www.joneslegacycreations.com/services/interior-design/gallery",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/services/interior-design/gallery",
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.joneslegacycreations.com" },
          { name: "Interior Design", url: "https://www.joneslegacycreations.com/services/interior-design" },
          { name: "Gallery", url: "https://www.joneslegacycreations.com/services/interior-design/gallery" },
        ]}
      />
      {children}
    </>
  );
}
