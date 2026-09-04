import { describe, it, expect } from "vitest";
import {
  partitionReviews,
  pickFeaturedReview,
  compareReviews,
  hasVideo,
  serviceLabel,
  availableServices,
  averageRating,
  type ReviewRow,
} from "./reviews";

function row(over: Partial<ReviewRow> = {}): ReviewRow {
  return {
    id: "1",
    author_name: "Sarah Reynolds",
    author_role: "Homeowner, Hurricane UT",
    service: "construction",
    rating: 5,
    quote: "They built our dream home.",
    source: "manual",
    source_url: null,
    author_photo_url: null,
    video_url: null,
    video_poster_url: null,
    video_duration_seconds: null,
    display_order: 100,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("hasVideo", () => {
  it("is true only for a non-empty url", () => {
    expect(hasVideo(row({ video_url: "https://x/v.mp4" }))).toBe(true);
    expect(hasVideo(row({ video_url: null }))).toBe(false);
    expect(hasVideo(row({ video_url: "   " }))).toBe(false);
  });

  it("counts a video with no poster — the card falls back rather than dropping it", () => {
    expect(hasVideo(row({ video_url: "https://x/v.mp4", video_poster_url: null }))).toBe(true);
  });
});

describe("compareReviews", () => {
  it("puts the lower display_order first", () => {
    const pinned = row({ id: "a", display_order: 1 });
    const normal = row({ id: "b", display_order: 100 });
    expect([normal, pinned].sort(compareReviews).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("breaks ties with newest first", () => {
    const older = row({ id: "old", created_at: "2025-01-01T00:00:00Z" });
    const newer = row({ id: "new", created_at: "2026-06-01T00:00:00Z" });
    expect([older, newer].sort(compareReviews).map((r) => r.id)).toEqual(["new", "old"]);
  });
});

describe("partitionReviews", () => {
  it("splits video from written and sorts each", () => {
    const rows = [
      row({ id: "w2", display_order: 50 }),
      row({ id: "v1", display_order: 10, video_url: "https://x/1.mp4" }),
      row({ id: "w1", display_order: 5 }),
      row({ id: "v2", display_order: 20, video_url: "https://x/2.mp4" }),
    ];
    const { videos, written } = partitionReviews(rows);
    expect(videos.map((r) => r.id)).toEqual(["v1", "v2"]);
    expect(written.map((r) => r.id)).toEqual(["w1", "w2"]);
  });

  it("handles an empty list without throwing", () => {
    expect(partitionReviews([])).toEqual({ videos: [], written: [] });
  });

  it("does not mutate the caller's array order", () => {
    const rows = [row({ id: "b", display_order: 99 }), row({ id: "a", display_order: 1 })];
    partitionReviews(rows);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("pickFeaturedReview", () => {
  it("prefers a video review over a higher-pinned written one", () => {
    const rows = [
      row({ id: "pinned-text", display_order: 1 }),
      row({ id: "video", display_order: 90, video_url: "https://x/v.mp4" }),
    ];
    expect(pickFeaturedReview(rows)?.id).toBe("video");
  });

  it("uses pin order to choose among several videos", () => {
    const rows = [
      row({ id: "v-late", display_order: 80, video_url: "https://x/2.mp4" }),
      row({ id: "v-early", display_order: 2, video_url: "https://x/1.mp4" }),
    ];
    expect(pickFeaturedReview(rows)?.id).toBe("v-early");
  });

  it("falls back to the top written review when no video exists", () => {
    const rows = [
      row({ id: "b", display_order: 50 }),
      row({ id: "a", display_order: 3 }),
    ];
    expect(pickFeaturedReview(rows)?.id).toBe("a");
  });

  it("returns null for an empty list so the caller renders nothing", () => {
    expect(pickFeaturedReview([])).toBeNull();
  });

  it("does not mutate the caller's array", () => {
    const rows = [row({ id: "b", display_order: 99 }), row({ id: "a", display_order: 1 })];
    pickFeaturedReview(rows);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("serviceLabel", () => {
  it("maps known services to client-facing names", () => {
    expect(serviceLabel("construction")).toBe("Custom homes");
    expect(serviceLabel("real_estate")).toBe("Real estate");
    expect(serviceLabel("interior_design")).toBe("Interior design");
  });

  it("falls back for an unrecognised service rather than rendering undefined", () => {
    expect(serviceLabel("landscaping")).toBe("Jones Legacy Creations");
  });
});

describe("availableServices", () => {
  it("returns only services present, in display order", () => {
    const rows = [row({ service: "general" }), row({ service: "construction" })];
    expect(availableServices(rows)).toEqual(["construction", "general"]);
  });

  it("is empty when there are no rows", () => {
    expect(availableServices([])).toEqual([]);
  });
});

describe("averageRating", () => {
  it("averages to one decimal", () => {
    const rows = [row({ rating: 5 }), row({ rating: 4 }), row({ rating: 5 })];
    expect(averageRating(rows)).toBe(4.7);
  });

  it("ignores unrated rows", () => {
    expect(averageRating([row({ rating: 5 }), row({ rating: null })])).toBe(5);
  });

  it("is null when nothing is rated, so the page omits the summary", () => {
    expect(averageRating([row({ rating: null })])).toBeNull();
    expect(averageRating([])).toBeNull();
  });
});
