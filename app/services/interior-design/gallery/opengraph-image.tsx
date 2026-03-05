import { createOgImage } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Interior Design Portfolio Gallery - Interiors By Jones";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImage({
    title: "Design Portfolio Gallery",
    subtitle: "Browse kitchens, bedrooms, living rooms, and bathrooms from our Southern Utah projects.",
    badge: "Interiors By Jones",
  });
}
