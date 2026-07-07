import { describe, it, expect } from "vitest";
import { buildChangeOrderPdf } from "./changeOrderPdf";
import { buildSelectionPdf } from "./selectionPdf";

function isPdf(bytes: Uint8Array): boolean {
  // Every PDF starts with the "%PDF-" magic bytes.
  return (
    bytes.length > 500 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

// A fixed instant keeps the date-formatting path deterministic across machines.
const FIXED = new Date(1751904000000);

describe("buildChangeOrderPdf", () => {
  it("renders a valid PDF even with a negative price delta and a formatted date", async () => {
    const bytes = await buildChangeOrderPdf({
      projectName: "Maple Street Custom Home",
      title: "Drop the covered patio",
      description: "Remove patio and footings.\nCredit to owner.",
      reason: "Reallocating budget to the kitchen.",
      costDelta: -4200.5, // exercises the minus-sign path
      scheduleImpactDays: -3,
      consentText: "By signing I agree to this change.",
      signerName: "Jordan Q. Client",
      signedAt: FIXED,
      signerIp: "203.0.113.7",
    });
    expect(isPdf(bytes)).toBe(true);
  });

  it("handles empty optional fields and a zero delta", async () => {
    const bytes = await buildChangeOrderPdf({
      projectName: "Project",
      title: "No-cost clarification",
      description: null,
      reason: null,
      costDelta: 0,
      scheduleImpactDays: 0,
      consentText: "",
      signerName: "A Client",
      signedAt: FIXED,
    });
    expect(isPdf(bytes)).toBe(true);
  });
});

describe("buildSelectionPdf", () => {
  it("renders a valid declined-decision PDF without an image", async () => {
    const bytes = await buildSelectionPdf({
      projectName: "Maple Street Custom Home",
      title: "Kitchen countertop",
      selectionName: "Quartz — Calacatta",
      description: "Client-selected slab.",
      location: "Kitchen",
      costImpact: 3800,
      disclaimerText: "Natural materials vary; not liable for later dissatisfaction.",
      decision: "declined",
      deciderName: "Jordan Q. Client",
      decidedAt: FIXED,
      deciderIp: "203.0.113.7",
      declineReason: "Prefer different veining.",
      imageBytes: null,
      imageType: null,
    });
    expect(isPdf(bytes)).toBe(true);
  });

  it("silently skips an unsupported image type rather than throwing", async () => {
    const bytes = await buildSelectionPdf({
      projectName: "Project",
      title: "Tile",
      disclaimerText: "Disclaimer.",
      decision: "approved",
      deciderName: "A Client",
      decidedAt: FIXED,
      imageBytes: new Uint8Array([1, 2, 3, 4]), // not a real JPG/PNG
      imageType: "image/heic",
    });
    expect(isPdf(bytes)).toBe(true);
  });
});
