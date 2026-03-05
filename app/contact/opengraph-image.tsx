import { createOgImage } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Contact Jones Legacy Creations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImage({
    title: "Get In Touch",
    subtitle: "Contact our construction, real estate, or interior design teams. Serving Hurricane and all of Southern Utah.",
    badge: "Contact Us",
  });
}
