import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/test-heroes"],
      },
    ],
    sitemap: "https://www.joneslegacycreations.com/sitemap.xml",
  };
}
