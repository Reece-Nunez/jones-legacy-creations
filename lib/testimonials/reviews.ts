/**
 * Pure shaping helpers for the public /reviews page.
 *
 * The page is a server component that hands raw rows to these functions,
 * which decide ordering and grouping. Keeping the logic here (rather
 * than inline in JSX) makes the "video reviews lead" rule testable.
 */

export type TestimonialService =
  | "construction"
  | "real_estate"
  | "interior_design"
  | "general";

export interface ReviewRow {
  id: string;
  author_name: string;
  author_role: string | null;
  service: string;
  rating: number | null;
  quote: string;
  source: string | null;
  source_url: string | null;
  author_photo_url: string | null;
  video_url: string | null;
  video_poster_url: string | null;
  video_duration_seconds: number | null;
  display_order: number;
  created_at: string;
}

export const SERVICE_LABELS: Record<TestimonialService, string> = {
  construction: "Custom homes",
  real_estate: "Real estate",
  interior_design: "Interior design",
  general: "Jones Legacy Creations",
};

export function serviceLabel(service: string): string {
  return SERVICE_LABELS[service as TestimonialService] ?? SERVICE_LABELS.general;
}

/** Blake's pin order first, newest first within a tie. Mirrors the
 *  ordering the service-page sections already use, so a testimonial
 *  doesn't jump position between /reviews and /services/construction. */
export function compareReviews(a: ReviewRow, b: ReviewRow): number {
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  return b.created_at.localeCompare(a.created_at);
}

/** A row counts as a video review only when it can actually be played.
 *  A `video_url` with no poster still qualifies — the card falls back to
 *  a typographic poster rather than dropping the video. */
export function hasVideo(row: ReviewRow): boolean {
  return typeof row.video_url === "string" && row.video_url.trim().length > 0;
}

/**
 * Split rows into the video reel and the written grid, each sorted.
 *
 * Video leads the page because it's the scarcest and highest-converting
 * asset; written reviews carry the volume behind it.
 */
export function partitionReviews(rows: ReviewRow[]): {
  videos: ReviewRow[];
  written: ReviewRow[];
} {
  const videos: ReviewRow[] = [];
  const written: ReviewRow[] = [];
  for (const row of rows) {
    (hasVideo(row) ? videos : written).push(row);
  }
  videos.sort(compareReviews);
  written.sort(compareReviews);
  return { videos, written };
}

/** Distinct service filters present in the data, in a stable display
 *  order, so the page never renders a chip that matches nothing. */
export function availableServices(rows: ReviewRow[]): TestimonialService[] {
  const order: TestimonialService[] = [
    "construction",
    "real_estate",
    "interior_design",
    "general",
  ];
  const present = new Set(rows.map((r) => r.service));
  return order.filter((s) => present.has(s));
}

/** Average rating across rows that carry one, rounded to one decimal.
 *  Null when nobody has rated — the page then omits the rating summary
 *  rather than claiming a 0.0 average. */
export function averageRating(rows: ReviewRow[]): number | null {
  const rated = rows.filter((r) => r.rating != null) as (ReviewRow & {
    rating: number;
  })[];
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / rated.length) * 10) / 10;
}
