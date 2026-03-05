import { createOgImage } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Interiors By Jones - Interior Design & Home Staging in Southern Utah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImage({
    title: "Interior Design & Home Staging",
    subtitle: "Professional design consultation, styling, and staging services to transform your space.",
    badge: "Interiors By Jones",
  });
}
