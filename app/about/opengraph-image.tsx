import { createOgImage } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "About Jones Legacy Creations - Blake & Hilari Jones";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImage({
    title: "About Jones Legacy Creations",
    subtitle: "Meet Blake & Hilari — your one-stop shop for custom homes, real estate, and interior design in Southern Utah.",
    badge: "Our Story",
  });
}
