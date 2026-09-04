import { describe, it, expect } from "vitest";
import {
  MAX_VIDEO_BYTES,
  MAX_POSTER_BYTES,
  validateVideoFile,
  validatePosterFile,
  sanitizeFilename,
  buildAssetPath,
  formatDuration,
  formatMb,
} from "./video";

const mb = (n: number) => n * 1024 * 1024;

describe("validateVideoFile", () => {
  it("accepts a compressed mp4 under the ceiling", () => {
    expect(
      validateVideoFile({ name: "peach-grove.mp4", size: mb(12), type: "video/mp4" }),
    ).toEqual({ ok: true });
  });

  it("accepts MOV, which is what iPhone footage arrives as", () => {
    expect(
      validateVideoFile({ name: "IMG_0042.MOV", size: mb(30), type: "video/quicktime" }),
    ).toEqual({ ok: true });
  });

  it("rejects a non-video file", () => {
    const res = validateVideoFile({ name: "deck.pdf", size: mb(1), type: "application/pdf" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/MP4, MOV, or WebM/);
  });

  it("rejects the raw 39 MB source once it exceeds the ceiling and names the fix", () => {
    const res = validateVideoFile({
      name: "Homeowner Experience_Peach Grove.mp4",
      size: MAX_VIDEO_BYTES + 1,
      type: "video/mp4",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("50.0 MB");
      expect(res.error).toMatch(/compress/i);
    }
  });

  it("accepts a file exactly at the ceiling", () => {
    expect(
      validateVideoFile({ name: "a.mp4", size: MAX_VIDEO_BYTES, type: "video/mp4" }),
    ).toEqual({ ok: true });
  });

  it("rejects an empty file", () => {
    const res = validateVideoFile({ name: "a.mp4", size: 0, type: "video/mp4" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/empty/);
  });
});

describe("validatePosterFile", () => {
  it("accepts a jpg poster", () => {
    expect(
      validatePosterFile({ name: "poster.jpg", size: mb(1), type: "image/jpeg" }),
    ).toEqual({ ok: true });
  });

  it("rejects a video passed to the poster field", () => {
    const res = validatePosterFile({ name: "clip.mp4", size: mb(1), type: "video/mp4" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/JPG, PNG, or WebP/);
  });

  it("rejects an oversized poster", () => {
    const res = validatePosterFile({
      name: "huge.png",
      size: MAX_POSTER_BYTES + 1,
      type: "image/png",
    });
    expect(res.ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("collapses spaces and underscores in the real filename", () => {
    expect(sanitizeFilename("Homeowner Experience_Peach Grove.mp4")).toBe(
      "homeowner-experience-peach-grove.mp4",
    );
  });

  it("strips path separators so the key cannot escape its folder", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(sanitizeFilename("a/b/c.mp4")).toBe("a-b-c.mp4");
  });

  it("falls back rather than returning an empty key", () => {
    expect(sanitizeFilename("!!!")).toBe("file");
    expect(sanitizeFilename("")).toBe("file");
  });

  it("caps runaway filenames", () => {
    expect(sanitizeFilename("x".repeat(200)).length).toBe(80);
  });
});

describe("buildAssetPath", () => {
  it("folders by author and timestamps the object", () => {
    expect(buildAssetPath("Sarah Reynolds", "clip.mp4", 1_700_000_000_000)).toBe(
      "sarah-reynolds/1700000000000-clip.mp4",
    );
  });

  it("falls back to a generic folder for an unusable author name", () => {
    expect(buildAssetPath("!!!", "clip.mp4", 1)).toBe("file/1-clip.mp4");
  });

  it("keeps two uploads of the same filename distinct", () => {
    const a = buildAssetPath("Blake", "clip.mp4", 1);
    const b = buildAssetPath("Blake", "clip.mp4", 2);
    expect(a).not.toBe(b);
  });
});

describe("formatDuration", () => {
  it("pads seconds", () => {
    expect(formatDuration(134)).toBe("2:14");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(9)).toBe("0:09");
  });

  it("returns null for unknown or nonsense durations", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(-5)).toBeNull();
    expect(formatDuration(NaN)).toBeNull();
  });
});

describe("formatMb", () => {
  it("renders one decimal", () => {
    expect(formatMb(mb(39.4))).toBe("39.4 MB");
  });
});
