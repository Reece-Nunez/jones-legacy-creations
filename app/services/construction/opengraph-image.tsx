import { createOgImage } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Jones Custom Homes - Custom Home Construction in Southern Utah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImage({
    title: "Custom Home Construction",
    subtitle: "Quality custom homes, renovations, and commercial projects in Hurricane and Southern Utah.",
    badge: "Jones Custom Homes",
  });
}
