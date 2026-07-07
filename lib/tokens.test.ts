import { describe, it, expect } from "vitest";
import { generateToken } from "./tokens";

describe("generateToken", () => {
  it("returns a URL-safe base64url string (no +, /, or = padding)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("encodes 32 bytes by default (~43 base64url chars)", () => {
    expect(generateToken().length).toBe(43);
  });

  it("produces distinct tokens across calls", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});
