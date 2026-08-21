import { describe, it, expect } from "vitest";
import {
  SOCIAL_ACCOUNTS,
  SOCIAL_BRANDS,
  SOCIAL_BRAND_LABELS,
  SOCIAL_PROFILE_URLS,
  socialsFor,
} from "./socials";

describe("socialsFor", () => {
  it("returns every account when no brand is given", () => {
    // Home, about, contact and Real Estate all fall through to this.
    expect(socialsFor()).toHaveLength(SOCIAL_ACCOUNTS.length);
    expect(socialsFor(undefined)).toEqual(SOCIAL_ACCOUNTS);
  });

  it("returns only the construction accounts", () => {
    const accounts = socialsFor("construction");
    expect(accounts).toHaveLength(2);
    expect(accounts.every((a) => a.brand === "construction")).toBe(true);
    expect(accounts.map((a) => a.platform).sort()).toEqual(["facebook", "instagram"]);
  });

  it("returns only the interior accounts", () => {
    const accounts = socialsFor("interior");
    expect(accounts).toHaveLength(2);
    expect(accounts.every((a) => a.brand === "interior")).toBe(true);
  });

  it("never leaks one brand's accounts into the other", () => {
    const construction = socialsFor("construction").map((a) => a.href);
    const interior = socialsFor("interior").map((a) => a.href);
    expect(construction.some((h) => interior.includes(h))).toBe(false);
  });

  it("partitions the full list exactly, so nothing is orphaned", () => {
    const grouped = SOCIAL_BRANDS.flatMap((b) => socialsFor(b));
    expect(grouped).toHaveLength(SOCIAL_ACCOUNTS.length);
  });
});

describe("account data", () => {
  it("has a distinct url per account", () => {
    expect(new Set(SOCIAL_PROFILE_URLS).size).toBe(SOCIAL_ACCOUNTS.length);
  });

  it("uses absolute https urls", () => {
    for (const a of SOCIAL_ACCOUNTS) {
      expect(() => new URL(a.href), a.label).not.toThrow();
      expect(a.href.startsWith("https://"), a.label).toBe(true);
    }
  });

  it("gives every account a label naming both the account and the platform", () => {
    // Icon-only links announce nothing else, so a bare "Instagram" would leave
    // a screen reader user unable to tell the two Instagram accounts apart.
    for (const a of SOCIAL_ACCOUNTS) {
      expect(a.label.toLowerCase(), a.href).toContain(a.platform);
      expect(a.label.length).toBeGreaterThan(a.platform.length + 3);
    }
  });

  it("has a distinct label per account", () => {
    expect(new Set(SOCIAL_ACCOUNTS.map((a) => a.label)).size).toBe(SOCIAL_ACCOUNTS.length);
  });

  it("points each account at a host matching its platform", () => {
    for (const a of SOCIAL_ACCOUNTS) {
      expect(new URL(a.href).hostname, a.label).toContain(a.platform);
    }
  });

  it("labels every brand it declares", () => {
    for (const brand of SOCIAL_BRANDS) {
      expect(SOCIAL_BRAND_LABELS[brand]).toBeTruthy();
    }
    expect(SOCIAL_BRANDS).toHaveLength(Object.keys(SOCIAL_BRAND_LABELS).length);
  });
});
