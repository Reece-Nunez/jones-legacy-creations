import { describe, it, expect } from "vitest";
import { _buildUserPrompt } from "./estimate-generator";
import type { EstimateInput } from "./estimate-generator";

const base = {
  project_type: "new_build",
  city: "Hurricane",
} as unknown as EstimateInput;

const promptFor = (state: string | null) =>
  _buildUserPrompt({ ...base, state } as EstimateInput);

const UTAH_ANCHOR = "typical Southern Utah pricing";
const OUT_OF_AREA = "outside Blake's Southern Utah market";

describe("buildUserPrompt — pricing market", () => {
  it("keeps the Southern Utah anchor for Utah projects", () => {
    const p = promptFor("UT");
    expect(p).toContain(UTAH_ANCHOR);
    expect(p).not.toContain(OUT_OF_AREA);
  });

  it("treats a missing state as the home market", () => {
    // The DB default is 'UT', so absent state must not trip the out-of-area
    // path for the many existing Utah estimates.
    const p = promptFor(null);
    expect(p).toContain(UTAH_ANCHOR);
    expect(p).not.toContain(OUT_OF_AREA);
  });

  it("drops the Utah price anchor once the project leaves the state", () => {
    const p = promptFor("WY");
    expect(p).not.toContain(UTAH_ANCHOR);
    expect(p).toContain(OUT_OF_AREA);
  });

  it("names the actual state so the model can reason about local costs", () => {
    const p = promptFor("WY");
    expect(p).toContain("This project is in WY");
    expect(p).toContain("building in WY actually costs");
  });

  it("tells the model to widen the range and flag it as out-of-area", () => {
    const p = promptFor("WY");
    expect(p).toContain("no local comparables");
    expect(p).toContain("needs a local bid");
  });

  it("normalizes casing and stray whitespace", () => {
    for (const raw of ["wy", " Wy ", "wY"]) {
      const p = promptFor(raw);
      expect(p).toContain("This project is in WY");
      expect(p).not.toContain(UTAH_ANCHOR);
    }
    // Lowercase "ut" is still the home market, not a foreign state.
    expect(promptFor("ut")).toContain(UTAH_ANCHOR);
  });

  it("reports the resolved state in the Location line", () => {
    expect(promptFor("wy")).toContain("Location: <client_input>Hurricane</client_input>, WY");
    expect(promptFor(null)).toContain(", UT");
  });

  it("still instructs the model to anchor on the reference projects", () => {
    // The out-of-area path adjusts the anchor, it doesn't discard the data.
    expect(promptFor("WY")).toContain("Anchor the min/max on the reference projects");
  });
});
