export type ShowcaseStatus = "draft" | "active" | "archived";
export type ProjectPhase = "current" | "completed";
export type ShowcaseCategory = "construction" | "interior_design";

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
  project_phase: ProjectPhase;
  category: ShowcaseCategory;
  created_at: string;
  updated_at: string;
}

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  current: "Current (Coming Soon / In Progress)",
  completed: "Completed Build",
};

export const SHOWCASE_CATEGORY_LABELS: Record<ShowcaseCategory, string> = {
  construction: "Construction",
  interior_design: "Interior Design",
};

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
 * Use on form SUBMIT or when generating a slug from a title.
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

/**
 * Sanitize a slug while the user is still typing it. Keeps trailing and
 * leading dashes so the user can actually type them mid-word. Final cleanup
 * (trim dashes) happens on submit via slugify().
 */
export function slugifyLive(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .slice(0, 80);
}
