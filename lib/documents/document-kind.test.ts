import { describe, it, expect } from "vitest";
import { fieldEligibleForKind, isDocumentKind, DOCUMENT_KINDS } from "./document-kind";
import { planFlags, type FlagSubject } from "./flag-plan";

/**
 * Regression cases from the first real scan of Chelsey Lot 27.
 *
 * Each of these was raised as a confident flag with an Accept button next to
 * it, and each would have replaced correct project data with some other
 * party's details. They are pinned by document kind, not by confidence,
 * because the model was "high" confidence on every one of them.
 */

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
    contract_value: null,
    start_date: null,
  },
};

const payment: FlagSubject = {
  table: "contractor_payments",
  id: "payment-1",
  values: { amount: 2306, contractor_name: "GEM Engineering Inc" },
};

describe("field eligibility by document kind", () => {
  it("every kind is a known kind", () => {
    for (const kind of DOCUMENT_KINDS) expect(isDocumentKind(kind)).toBe(true);
    expect(isDocumentKind("spreadsheet")).toBe(false);
  });

  it("an invoice cannot speak for the project's address or client", () => {
    // The addresses on an invoice are the vendor's and the bill-to's.
    expect(fieldEligibleForKind("invoice", "projects.address")).toBe(false);
    expect(fieldEligibleForKind("invoice", "projects.city")).toBe(false);
    expect(fieldEligibleForKind("invoice", "projects.zip")).toBe(false);
    expect(fieldEligibleForKind("invoice", "projects.client_name")).toBe(false);
  });

  it("an invoice can speak for its own payment", () => {
    expect(fieldEligibleForKind("invoice", "contractor_payments.amount")).toBe(true);
    expect(fieldEligibleForKind("invoice", "contractor_payments.contractor_name")).toBe(true);
  });

  it("only a contract or loan document may move project money", () => {
    expect(fieldEligibleForKind("contract", "projects.contract_value")).toBe(true);
    expect(fieldEligibleForKind("loan", "projects.loan_amount")).toBe(true);
    // A roofing sub's quote is not the project's contract value.
    expect(fieldEligibleForKind("invoice", "projects.contract_value")).toBe(false);
    expect(fieldEligibleForKind("plan", "projects.contract_value")).toBe(false);
    expect(fieldEligibleForKind("permit", "projects.loan_amount")).toBe(false);
  });

  it("a permit names a site but does not set the schedule", () => {
    expect(fieldEligibleForKind("permit", "projects.address")).toBe(true);
    // A septic notice's issue date is not the project start date.
    expect(fieldEligibleForKind("permit", "projects.start_date")).toBe(false);
    expect(fieldEligibleForKind("contract", "projects.start_date")).toBe(true);
  });

  it("nothing is trusted from an unclassified document", () => {
    expect(fieldEligibleForKind("other", "projects.address")).toBe(false);
    expect(fieldEligibleForKind("other", "contractor_payments.amount")).toBe(false);
  });
});

describe("planFlags with the kind guard", () => {
  it("drops the GEM invoice's bill-to block", () => {
    // Verbatim from what the model returned for
    // Invoice_34703_from_GEM_ENGINEERING_INC.pdf — all "high" confidence.
    const raw = [
      { field: "projects.address", value: "1786 South 920 West", confidence: "high" },
      { field: "projects.city", value: "Hurricane", confidence: "high" },
      { field: "projects.zip", value: "84737", confidence: "high" },
      { field: "projects.client_name", value: "Jones Custom Homes", confidence: "high" },
    ];

    expect(planFlags(raw, [project, payment], "invoice")).toEqual([]);
  });

  it("drops a subcontractor quote's total from contract_value", () => {
    const raw = [{ field: "projects.contract_value", value: "28166.99", confidence: "high" }];
    expect(planFlags(raw, [project], "invoice")).toEqual([]);
  });

  it("still raises the invoice's own amount against the payment", () => {
    const raw = [{ field: "contractor_payments.amount", value: "$2,450.00", confidence: "high" }];
    const flags = planFlags(raw, [project, payment], "invoice");

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      target_table: "contractor_payments",
      target_field: "amount",
      current_value: "2306",
      suggested_value: "2450",
    });
  });

  it("lets a contract set the contract value it is blank", () => {
    const raw = [{ field: "projects.contract_value", value: "$650,000.00", confidence: "high" }];
    const flags = planFlags(raw, [project], "contract");

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      target_field: "contract_value",
      current_value: null,
      suggested_value: "650000",
    });
  });

  it("lets stamped drawings correct the site address", () => {
    const raw = [{ field: "projects.address", value: "2945 Chelsey Parkway", confidence: "high" }];
    expect(planFlags(raw, [project], "plan")).toHaveLength(1);
  });

  it("a budget document raises no field flags at all", () => {
    const raw = [
      { field: "projects.contract_value", value: "650000", confidence: "high" },
      { field: "projects.address", value: "somewhere else", confidence: "high" },
    ];
    expect(planFlags(raw, [project], "budget")).toEqual([]);
  });
});
