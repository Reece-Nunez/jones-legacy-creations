import { describe, it, expect } from "vitest";
import {
  buildChangeOrderEmail,
  buildSelectionEmail,
  buildBidRequestEmail,
  buildBidAcceptedEmail,
  buildInvoiceRequestEmail,
  BRAND_FROM,
} from "./approvalEmails";

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

describe("buildBidRequestEmail", () => {
  it("includes the link, project, title and custom message", () => {
    const { subject, html } = buildBidRequestEmail({
      link: "https://example.com/respond-bid/tok123",
      projectName: "Maple St. New Build",
      contractorName: "Dry Creek Framing",
      title: "Framing — bid request",
      customMessage: "Plans attached. Need a number by Friday.",
    });
    expect(subject).toContain("Maple St. New Build");
    expect(html).toContain("https://example.com/respond-bid/tok123");
    expect(html).toContain("Framing — bid request");
    expect(html).toContain("Need a number by Friday.");
    expect(html).toContain("Dry Creek Framing");
  });

  it("escapes HTML in caller-supplied fields", () => {
    const { html } = buildBidRequestEmail({
      link: "https://example.com/x",
      projectName: "Job <script>",
      title: "T",
    });
    expect(html).not.toContain("Job <script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildBidAcceptedEmail", () => {
  it("uses Blake's confirmation wording and carries no CTA link", () => {
    const { subject, html } = buildBidAcceptedEmail({
      projectName: "Maple St. New Build",
      contractorName: "Dry Creek Framing",
      title: "Framing",
    });
    expect(subject).toContain("accepted");
    expect(html).toContain("Your bid has been accepted");
    expect(html).toContain("contact you for scheduling");
    expect(html).not.toContain("<a ");
  });
});

describe("buildInvoiceRequestEmail", () => {
  it("links to the invoice upload and names the project", () => {
    const { subject, html } = buildInvoiceRequestEmail({
      link: "https://example.com/submit-invoice/tok9",
      projectName: "Maple St. New Build",
      contractorName: "Dry Creek Framing",
      title: "Framing",
    });
    expect(subject).toContain("invoice");
    expect(subject).toContain("Maple St. New Build");
    expect(html).toContain("https://example.com/submit-invoice/tok9");
    expect(html).toContain("Upload Invoice");
  });
});

describe("BRAND_FROM", () => {
  it("sends from the company noreply address", () => {
    expect(BRAND_FROM).toContain("noreply@joneslegacycreations.com");
  });
});
