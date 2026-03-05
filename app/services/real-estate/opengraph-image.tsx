import { createOgImage } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "Blake Jones Realty - Real Estate Services in Southern Utah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return createOgImage({
    title: "Real Estate Services",
    subtitle: "Buy, sell, or invest in properties across Hurricane, St. George, and Southern Utah with expert local guidance.",
    badge: "Blake Jones Realty",
  });
}
