import { describe, it, expect } from "vitest";
import { getInitials, resolveAvatarUrl } from "./avatar";

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Brad Lister")).toBe("BL");
    expect(getInitials("Darren Jones")).toBe("DJ");
  });

  it("caps at two letters for longer names", () => {
    expect(getInitials("Mary Jane Watson Parker")).toBe("MJ");
  });

  it("handles a single name", () => {
    expect(getInitials("Blake")).toBe("B");
  });

  it("uppercases lowercase input", () => {
    expect(getInitials("blake jones")).toBe("BJ");
  });

  it("survives extra whitespace rather than emitting undefined", () => {
    expect(getInitials("  Brad   Lister ")).toBe("BL");
  });

  it("falls back to ? for an empty name", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });
});

describe("resolveAvatarUrl", () => {
  it("returns null when there is no url", () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl(undefined)).toBeNull();
    expect(resolveAvatarUrl("")).toBeNull();
  });

  it("ignores Google's auto-populated avatars so we show our own badge", () => {
    // These are generated monograms, not photos anyone chose — rendering them
    // made the list half Google letter-tiles and half our initials badges.
    expect(
      resolveAvatarUrl(
        "https://lh3.googleusercontent.com/a/ACg8ocL37CfM8Fr-Yf-NoWbj8mYWZl1WhszgkRtN4Fw8j7dbYU-mIw=s96-c",
      ),
    ).toBeNull();
  });

  it("keeps an avatar the user actually uploaded to our bucket", () => {
    const uploaded =
      "https://rvyummgsvggjqtjbtqfw.supabase.co/storage/v1/object/public/avatars/abc/photo.jpg";
    expect(resolveAvatarUrl(uploaded)).toBe(uploaded);
  });

  it("only matches the exact host, not lookalikes", () => {
    const lookalike = "https://lh3.googleusercontent.com.evil.test/a/x=s96-c";
    expect(resolveAvatarUrl(lookalike)).toBe(lookalike);
  });

  it("returns null for an unparseable url instead of throwing", () => {
    expect(() => resolveAvatarUrl("not a url")).not.toThrow();
    expect(resolveAvatarUrl("not a url")).toBeNull();
  });
});
