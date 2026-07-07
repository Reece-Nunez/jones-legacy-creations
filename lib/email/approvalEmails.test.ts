import { describe, it, expect } from "vitest";
import { buildChangeOrderEmail, buildSelectionEmail, BRAND_FROM } from "./approvalEmails";

const LINK = "https://example.com/sign-change-order/abc123";

describe("buildChangeOrderEmail", () => {
  it("includes the signing link and the project name in the subject", () => {
    const { subject, html } = buildChangeOrderEmail({
      link: LINK,
      projectName: "Maple Street",
      clientName: "Jordan",
      title: "Patio change",
    });
    expect(html).toContain(LINK);
    expect(subject).toContain("Maple Street");
    expect(html).toContain("Jordan");
  });

  it("escapes HTML in the title to prevent injection", () => {
    const { html } = buildChangeOrderEmail({
      link: LINK,
      projectName: "P",
      clientName: null,
      title: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildSelectionEmail", () => {
  it("includes the review link and a subject naming the project", () => {
    const { subject, html } = buildSelectionEmail({
      link: LINK,
      projectName: "Maple Street",
      clientName: null,
      title: "Quartz countertop",
    });
    expect(html).toContain(LINK);
    expect(subject).toContain("Maple Street");
  });
});

describe("BRAND_FROM", () => {
  it("sends from the company noreply address", () => {
    expect(BRAND_FROM).toContain("noreply@joneslegacycreations.com");
  });
});
