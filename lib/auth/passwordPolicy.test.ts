import { describe, it, expect } from "vitest";
import {
  PASSWORD_RULES,
  evaluatePassword,
  isPasswordValid,
  passwordProblems,
} from "./passwordPolicy";

const met = (pw: string, id: string) =>
  evaluatePassword(pw).find((r) => r.id === id)!.met;

describe("length rule — more than 6 characters", () => {
  it("rejects exactly 6 and accepts 7", () => {
    // "More than 6", so 6 is not enough.
    expect(met("Abc12!", "length")).toBe(false);
    expect(met("Abc123!", "length")).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(met("", "length")).toBe(false);
  });
});

describe("uppercase rule", () => {
  it("needs at least one capital", () => {
    expect(met("abcdefg1!", "uppercase")).toBe(false);
    expect(met("abcdefG1!", "uppercase")).toBe(true);
  });
});

describe("special-character rule", () => {
  it("rejects letters and digits alone", () => {
    expect(met("Abcdefg1", "special")).toBe(false);
  });

  it("accepts common punctuation and symbols", () => {
    for (const ch of ["!", "@", "#", "$", "%", "^", "&", "*", "-", "_", ".", "?", " "]) {
      expect(met(`Abcdefg1${ch}`, "special"), `expected ${JSON.stringify(ch)} to count`).toBe(true);
    }
  });

  it("accepts non-ASCII symbols rather than rejecting a strong password", () => {
    expect(met("Abcdefg1£", "special")).toBe(true);
    expect(met("Abcdefg1—", "special")).toBe(true);
  });
});

describe("isPasswordValid", () => {
  it("requires every rule at once", () => {
    expect(isPasswordValid("Passw0rd!")).toBe(true);
    expect(isPasswordValid("password!")).toBe(false); // no capital
    expect(isPasswordValid("Password")).toBe(false);  // no special
    expect(isPasswordValid("Pa1!")).toBe(false);      // too short
    expect(isPasswordValid("")).toBe(false);
  });
});

describe("passwordProblems", () => {
  it("is empty for a valid password", () => {
    expect(passwordProblems("Passw0rd!")).toEqual([]);
  });

  it("lists every unmet rule", () => {
    expect(passwordProblems("abc")).toHaveLength(3);
    expect(passwordProblems("abcdefg!")).toEqual(["At least one capital letter"]);
  });
});

describe("evaluatePassword", () => {
  it("returns one entry per rule, in declaration order", () => {
    const res = evaluatePassword("x");
    expect(res.map((r) => r.id)).toEqual(PASSWORD_RULES.map((r) => r.id));
  });

  it("carries the human-readable label through for the checklist", () => {
    expect(evaluatePassword("x").every((r) => r.label.length > 0)).toBe(true);
  });

  it("flips a rule to met as soon as it is satisfied", () => {
    // Drives the live indicators, so partial credit has to work.
    const partial = evaluatePassword("Abcdefgh");
    expect(partial.find((r) => r.id === "length")!.met).toBe(true);
    expect(partial.find((r) => r.id === "uppercase")!.met).toBe(true);
    expect(partial.find((r) => r.id === "special")!.met).toBe(false);
  });
});
