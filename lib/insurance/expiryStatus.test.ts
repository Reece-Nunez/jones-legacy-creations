import { describe, it, expect } from "vitest";
import {
  daysUntilExpiration,
  expiryStatus,
  businessToday,
  EXPIRING_SOON_DAYS,
} from "./expiryStatus";

// Fixed "now" so the suite doesn't drift as real time passes. Late in the
// local day on purpose — that's when timezone bugs surface.
const TODAY = new Date(2026, 7, 20, 23, 30); // 2026-08-20, local

describe("daysUntilExpiration", () => {
  it("returns null when the policy has no expiration on file", () => {
    expect(daysUntilExpiration(null, TODAY)).toBeNull();
    expect(daysUntilExpiration(undefined, TODAY)).toBeNull();
    expect(daysUntilExpiration("", TODAY)).toBeNull();
  });

  it("returns null for an unparseable date rather than NaN", () => {
    expect(daysUntilExpiration("not-a-date", TODAY)).toBeNull();
  });

  it("counts a policy expiring today as 0 days, not -1", () => {
    // Regression guard: parsing "2026-08-20" via new Date() in Utah (UTC-6)
    // lands on Aug 19 local, which made same-day policies read as expired.
    expect(daysUntilExpiration("2026-08-20", TODAY)).toBe(0);
  });

  it("counts forward and backward in whole days", () => {
    expect(daysUntilExpiration("2026-08-21", TODAY)).toBe(1);
    expect(daysUntilExpiration("2026-08-19", TODAY)).toBe(-1);
    expect(daysUntilExpiration("2026-09-19", TODAY)).toBe(30);
  });

  it("is unaffected by the time of day the page renders", () => {
    const morning = new Date(2026, 7, 20, 0, 1);
    const night = new Date(2026, 7, 20, 23, 59);
    expect(daysUntilExpiration("2026-09-01", morning)).toBe(
      daysUntilExpiration("2026-09-01", night),
    );
  });

  it("spans month and year boundaries", () => {
    expect(daysUntilExpiration("2026-09-01", TODAY)).toBe(12);
    expect(daysUntilExpiration("2027-01-01", TODAY)).toBe(134);
  });

  it("tolerates a full timestamp, not just a bare date", () => {
    expect(daysUntilExpiration("2026-08-25T00:00:00Z", TODAY)).toBe(5);
  });
});

describe("expiryStatus", () => {
  it("reports unknown when undated", () => {
    expect(expiryStatus(null, TODAY)).toBe("unknown");
  });

  it("reports expired only once the date has passed", () => {
    expect(expiryStatus("2026-08-19", TODAY)).toBe("expired");
    // Coverage runs through the end of the stated day.
    expect(expiryStatus("2026-08-20", TODAY)).toBe("expiring");
  });

  it("flags policies inside the renewal window", () => {
    expect(expiryStatus("2026-08-21", TODAY)).toBe("expiring");
    expect(expiryStatus("2026-09-19", TODAY)).toBe("expiring"); // exactly 30d
  });

  it("reports current beyond the renewal window", () => {
    expect(expiryStatus("2026-09-20", TODAY)).toBe("current"); // 31d
    expect(expiryStatus("2027-08-20", TODAY)).toBe("current");
  });

  it("switches at exactly the documented boundary", () => {
    const boundary = new Date(TODAY);
    boundary.setDate(boundary.getDate() + EXPIRING_SOON_DAYS);
    const iso = `${boundary.getFullYear()}-${String(boundary.getMonth() + 1).padStart(2, "0")}-${String(boundary.getDate()).padStart(2, "0")}`;
    expect(expiryStatus(iso, TODAY)).toBe("expiring");
  });
});

describe("businessToday", () => {
  it("resolves to the Utah calendar day, not the UTC one", () => {
    // 2026-08-21 04:00 UTC is still 2026-08-20 22:00 in Utah (MDT, UTC-6).
    // Using the UTC day here would age every policy by one day each evening.
    const t = businessToday(new Date("2026-08-21T04:00:00Z"));
    expect(t.getFullYear()).toBe(2026);
    expect(t.getMonth()).toBe(7); // August
    expect(t.getDate()).toBe(20);
  });

  it("rolls over once Utah reaches midnight", () => {
    // 2026-08-21 06:01 UTC == 2026-08-21 00:01 MDT.
    const t = businessToday(new Date("2026-08-21T06:01:00Z"));
    expect(t.getDate()).toBe(21);
  });

  it("handles standard time, when Utah is UTC-7", () => {
    // 2026-01-15 06:30 UTC == 2026-01-14 23:30 MST.
    const t = businessToday(new Date("2026-01-15T06:30:00Z"));
    expect(t.getMonth()).toBe(0);
    expect(t.getDate()).toBe(14);
  });

  it("is midnight-anchored so it can be compared directly", () => {
    const t = businessToday(new Date("2026-08-21T04:00:00Z"));
    expect([t.getHours(), t.getMinutes(), t.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("gives a stable answer that expiryStatus can key off", () => {
    // Same instant, so SSR and the browser must classify identically.
    const instant = new Date("2026-08-21T04:00:00Z");
    expect(expiryStatus("2026-08-20", businessToday(instant))).toBe("expiring");
    expect(expiryStatus("2026-08-19", businessToday(instant))).toBe("expired");
  });
});
