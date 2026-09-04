import { describe, it, expect } from "vitest";
import { isOwnIdentity, isOwnSecondaryValue, type OwnIdentity } from "./own-identity";
import { planFlags, type FlagSubject } from "./flag-plan";

/**
 * Jones Custom Homes' own details must never become a project's.
 *
 * The office address and company name are on nearly every document as the
 * bill-to party, and the first real scan proposed both as the Lee project's
 * site address and client name.
 */

const identity: OwnIdentity = {
  names: ["jones custom homes", "jones legacy creations", "blake jones"],
  addresses: ["1786 south 920 west"],
  values: ["hurricane", "84737", "ut", "435-555-0100", "blake@joneslegacycreations.com"],
};

const project: FlagSubject = {
  table: "projects",
  id: "project-1",
  values: {
    name: "Chelsey Lot 27",
    client_name: "Brandon & Mckenzie Lee",
    address: "2943 Chelsey Parkway",
    city: "Cedar City",
    state: "UT",
    zip: "84780",
  },
};

describe("isOwnIdentity", () => {
  it("recognises the company however the document renders it", () => {
    expect(isOwnIdentity(identity, "client_name", "Jones Custom Homes")).toBe(true);
    expect(isOwnIdentity(identity, "client_name", "JONES CUSTOM HOMES, LLC")).toBe(true);
    expect(isOwnIdentity(identity, "client_name", "Jones Custom Homes - Attn: Blake")).toBe(true);
    expect(isOwnIdentity(identity, "client_name", "Blake Jones")).toBe(true);
  });

  it("recognises the office address through abbreviation differences", () => {
    expect(isOwnIdentity(identity, "address", "1786 South 920 West")).toBe(true);
    expect(isOwnIdentity(identity, "address", "1786 S 920 W")).toBe(true);
  });

  it("leaves genuine client and site details alone", () => {
    expect(isOwnIdentity(identity, "client_name", "Brandon & Mckenzie Lee")).toBe(false);
    expect(isOwnIdentity(identity, "address", "2943 Chelsey Parkway")).toBe(false);
  });

  it("treats the office city and ZIP as weak on their own", () => {
    // Peach Springs really is in Hurricane 84737 — this must not be a strong
    // match, or a legitimate correction there would be silently dropped.
    expect(isOwnIdentity(identity, "city", "Hurricane")).toBe(false);
    expect(isOwnIdentity(identity, "zip", "84737")).toBe(false);
    expect(isOwnSecondaryValue(identity, "city", "Hurricane")).toBe(true);
    expect(isOwnSecondaryValue(identity, "zip", "84737")).toBe(true);
    expect(isOwnSecondaryValue(identity, "city", "Cedar City")).toBe(false);
  });
});

describe("planFlags with own-identity filtering", () => {
  it("drops the whole bill-to block a permit reports", () => {
    // A permit legitimately carries a site address, so the kind guard lets
    // these through — this filter is what stops them.
    const raw = [
      { field: "projects.address", value: "1786 South 920 West", confidence: "high" },
      { field: "projects.city", value: "Hurricane", confidence: "high" },
      { field: "projects.zip", value: "84737", confidence: "high" },
    ];

    expect(planFlags(raw, [project], "permit", identity)).toEqual([]);
  });

  it("drops the builder proposed as the client on a contract", () => {
    const raw = [{ field: "projects.client_name", value: "Jones Custom Homes LLC", confidence: "high" }];
    expect(planFlags(raw, [project], "contract", identity)).toEqual([]);
  });

  it("keeps a real site correction that happens to be in our town", () => {
    // No strong match anywhere in this batch, so "Hurricane" is taken at face
    // value: the project genuinely moved towns.
    const raw = [
      { field: "projects.address", value: "3632 W 1480 S", confidence: "high" },
      { field: "projects.city", value: "Hurricane", confidence: "high" },
    ];
    const flags = planFlags(raw, [project], "permit", identity);

    expect(flags.map((f) => f.target_field).sort()).toEqual(["address", "city"]);
  });

  it("still works when no company settings are configured", () => {
    // The hardcoded floor keeps the protection on even with an empty settings
    // row, so a fresh install isn't unprotected.
    const bare: OwnIdentity = { names: ["jones custom homes"], addresses: [], values: [] };
    const raw = [{ field: "projects.client_name", value: "Jones Custom Homes", confidence: "high" }];
    expect(planFlags(raw, [project], "contract", bare)).toEqual([]);
  });
});
