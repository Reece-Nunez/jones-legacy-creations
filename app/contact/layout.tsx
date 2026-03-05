import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Contact Us | Get a Free Consultation",
  description: "Contact Jones Legacy Creations for construction, real estate, or interior design services in Southern Utah. Reach our teams directly — Real Estate: (435) 288-9807, Construction: (435) 414-8701, Interior Design: (801) 735-7089.",
  openGraph: {
    title: "Contact Jones Legacy Creations",
    description: "Get in touch with our construction, real estate, or interior design teams. Serving Hurricane and all of Southern Utah.",
    url: "https://www.joneslegacycreations.com/contact",
  },
  alternates: {
    canonical: "https://www.joneslegacycreations.com/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.joneslegacycreations.com" },
          { name: "Contact", url: "https://www.joneslegacycreations.com/contact" },
        ]}
      />
      {children}
    </>
  );
}
