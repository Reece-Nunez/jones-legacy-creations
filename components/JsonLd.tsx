export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Jones Legacy Creations",
    description: "Custom home construction, real estate services, and professional interior design and staging in Southern Utah.",
    url: "https://www.joneslegacycreations.com",
    telephone: "+1-435-288-9807",
    email: "office@joneslegacycreations.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Hurricane",
      addressRegion: "UT",
      addressCountry: "US",
    },
    areaServed: [
      { "@type": "City", name: "Hurricane", containedInPlace: { "@type": "State", name: "Utah" } },
      { "@type": "City", name: "St. George", containedInPlace: { "@type": "State", name: "Utah" } },
      { "@type": "City", name: "Washington", containedInPlace: { "@type": "State", name: "Utah" } },
      { "@type": "City", name: "Ivins", containedInPlace: { "@type": "State", name: "Utah" } },
      { "@type": "City", name: "Santa Clara", containedInPlace: { "@type": "State", name: "Utah" } },
      { "@type": "City", name: "Cedar City", containedInPlace: { "@type": "State", name: "Utah" } },
    ],
    sameAs: [
      "https://www.instagram.com/jonescustomhomes/",
      "https://www.instagram.com/interiors.by.jch/",
      "https://www.facebook.com/profile.php?id=61575767564467",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Custom Home Construction",
            description: "Residential and commercial construction, renovations, and project management in Southern Utah.",
            provider: { "@type": "Organization", name: "Jones Custom Homes" },
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Real Estate Services",
            description: "Property search, market analysis, buyer and seller representation across Southern Utah.",
            provider: { "@type": "Organization", name: "Blake Jones Realty" },
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Interior Design & Home Staging",
            description: "Professional interior design, home staging, space planning, and color consultation.",
            provider: { "@type": "Organization", name: "Interiors By Jones" },
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function ServiceJsonLd({ name, description, provider }: { name: string; description: string; provider: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: provider,
      parentOrganization: {
        "@type": "Organization",
        name: "Jones Legacy Creations",
        url: "https://www.joneslegacycreations.com",
      },
    },
    areaServed: {
      "@type": "State",
      name: "Utah",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
