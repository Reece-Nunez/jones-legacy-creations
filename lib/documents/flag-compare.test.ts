import { describe, it, expect } from "vitest";
import { canonicalize, parseDate, parseNumber, valuesAgree } from "./flag-compare";

/**
 * These cases are the whole value of the feature. A review queue full of
 * "$45,744.00 differs from 45744" is a review queue Blake stops opening, so
 * every formatting difference that shows up on a real invoice is pinned here.
 */

describe("parseNumber", () => {
  it("reads money as written on an invoice", () => {
    expect(parseNumber("$45,744.00")).toBe(45744);
    expect(parseNumber("45744")).toBe(45744);
    expect(parseNumber("7.5%")).toBe(7.5);
    expect(parseNumber("(1,200)")).toBe(-1200);
  });

  it("returns null for something that isn't a number", () => {
    expect(parseNumber("net 30")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
});

describe("parseDate", () => {
  it("reads the formats construction documents use", () => {
    expect(parseDate("2026-03-05")).toBe("2026-03-05");
    expect(parseDate("3/5/2026")).toBe("2026-03-05");
    expect(parseDate("03-05-26")).toBe("2026-03-05");
    expect(parseDate("March 5, 2026")).toBe("2026-03-05");
    expect(parseDate("Mar. 5 2026")).toBe("2026-03-05");
  });

  it("rejects nonsense rather than guessing", () => {
    expect(parseDate("sometime in spring")).toBeNull();
    expect(parseDate("13/45/2026")).toBeNull();
  });
});

describe("valuesAgree", () => {
  it("ignores money formatting", () => {
    expect(valuesAgree("number", "45744", "$45,744.00")).toBe(true);
    expect(valuesAgree("number", "45744", "45744.004")).toBe(true);
  });

  it("still catches a real money difference", () => {
    expect(valuesAgree("number", "45744", "45774")).toBe(false);
    expect(valuesAgree("number", "45744", "45744.01")).toBe(false);
  });

  it("ignores date formatting", () => {
    expect(valuesAgree("date", "2026-03-05", "3/5/2026")).toBe(true);
    expect(valuesAgree("date", "2026-03-05", "March 5, 2026")).toBe(true);
    expect(valuesAgree("date", "2026-03-05", "2026-03-06")).toBe(false);
  });

  it("ignores case and punctuation in names", () => {
    expect(valuesAgree("text", "ACME Concrete LLC", "Acme Concrete, LLC")).toBe(true);
    expect(valuesAgree("text", "Blake Jones", "blake  jones")).toBe(true);
    expect(valuesAgree("text", "Blake Jones", "Blake Johnson")).toBe(false);
  });

  it("folds street abbreviations so the same address doesn't get flagged", () => {
    expect(valuesAgree("text", "1234 S Main St.", "1234 South Main Street")).toBe(true);
    expect(valuesAgree("text", "88 W Center Ave", "88 West Center Avenue")).toBe(true);
    expect(valuesAgree("text", "1234 S Main St", "1240 S Main St")).toBe(false);
  });

  it("treats a blank record as worth flagging", () => {
    // A field the document can fill in is exactly what Blake wants surfaced.
    expect(valuesAgree("text", null, "1234 S Main St")).toBe(false);
    expect(valuesAgree("text", "", "1234 S Main St")).toBe(false);
    expect(valuesAgree("number", null, "45744")).toBe(false);
  });
});

describe("canonicalize", () => {
  it("stores numbers and dates in one canonical form", () => {
    expect(canonicalize("number", "$45,744.00")).toBe("45744");
    expect(canonicalize("date", "3/5/2026")).toBe("2026-03-05");
    expect(canonicalize("text", "  Acme Concrete  ")).toBe("Acme Concrete");
  });

  it("drops values that can't be used for the field's type", () => {
    expect(canonicalize("number", "see attached")).toBeNull();
    expect(canonicalize("date", "TBD")).toBeNull();
    expect(canonicalize("text", "null")).toBeNull();
    expect(canonicalize("text", "N/A")).toBeNull();
    expect(canonicalize("text", null)).toBeNull();
  });
});
