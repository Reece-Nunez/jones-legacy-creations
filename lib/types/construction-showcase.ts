export type ShowcaseStatus = "draft" | "active" | "archived";

export interface ConstructionShowcase {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  description: string | null;
  features: string[];
  cover_image_url: string | null;
  sort_order: number;
  status: ShowcaseStatus;
  created_at: string;
  updated_at: string;
}

export interface ShowcasePhoto {
  id: string;
  showcase_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  created_at: string;
}

export interface ShowcaseWithPhotos extends ConstructionShowcase {
  photos: ShowcasePhoto[];
}

export const SHOWCASE_STATUS_LABELS: Record<ShowcaseStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const SHOWCASE_STATUS_COLORS: Record<ShowcaseStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

/**
 * Make a URL-safe slug from a title. Lowercases, replaces non-alphanumerics
 * with dashes, collapses multiple dashes, trims leading/trailing dashes.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
