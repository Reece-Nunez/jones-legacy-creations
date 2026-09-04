import { describe, it, expect } from "vitest";
import { planFlags, type FlagSubject } from "./flag-plan";

const subjects: FlagSubject[] = [
  {
    table: "projects",
    id: "project-1",
    values: {
      name: "Peach Springs",
      client_name: "Blake Jones",
      address: "1234 S Main St",
      city: "Hurricane",
      contract_value: 620000,
      start_date: "2026-03-05",
      zip: null,
    },
  },
  {
    table: "contractor_payments",
    id: "payment-1",
    values: { amount: 5873.93, contractor_name: "ACME Concrete LLC" },
  },
];

describe("planFlags", () => {
  it("keeps a genuine disagreement", () => {
    const flags = planFlags(
      [{ field: "projects.contract_value", value: "$645,000", explanation: "Contract page 1", confidence: "high" }],
      subjects,
    );

    expect(flags).toEqual([
      {
        category: "money",
        target_table: "projects",
        target_id: "project-1",
        target_field: "contract_value",
        current_value: "620000",
        suggested_value: "645000",
        confidence: "high",
        explanation: "Contract page 1",
      },
    ]);
  });

  it("drops differences that are only formatting", () => {
    const flags = planFlags(
      [
        { field: "contractor_payments.amount", value: "$5,873.93" },
        { field: "projects.address", value: "1234 South Main Street" },
        { field: "contractor_payments.contractor_name", value: "Acme Concrete, LLC" },
        { field: "projects.start_date", value: "3/5/2026" },
      ],
      subjects,
    );

    expect(flags).toEqual([]);
  });

  it("flags a field our records leave blank", () => {
    const flags = planFlags([{ field: "projects.zip", value: "84737" }], subjects);

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ target_field: "zip", current_value: null, suggested_value: "84737" });
  });

  it("refuses a field name that isn't on the allow-list", () => {
    // The model naming a column is the one way this feature could write
    // somewhere it has no business writing.
    const flags = planFlags(
      [
        { field: "projects.notes", value: "anything" },
        { field: "user_profiles.role", value: "admin" },
        { field: "projects.id", value: "00000000-0000-0000-0000-000000000000" },
        { field: "contractors.name", value: "Whoever" },
      ],
      subjects,
    );

    expect(flags).toEqual([]);
  });

  it("drops a value that can't be read as the field's type", () => {
    const flags = planFlags(
      [
        { field: "projects.contract_value", value: "see attached schedule" },
        { field: "projects.start_date", value: "TBD" },
      ],
      subjects,
    );

    expect(flags).toEqual([]);
  });

  it("raises one flag per field even if the model repeats itself", () => {
    const flags = planFlags(
      [
        { field: "projects.client_name", value: "Blake Johnson" },
        { field: "projects.client_name", value: "B. Johnson" },
      ],
      subjects,
    );

    expect(flags).toHaveLength(1);
    expect(flags[0].suggested_value).toBe("Blake Johnson");
  });

  it("defaults an unusable confidence to medium", () => {
    const flags = planFlags(
      [{ field: "projects.client_name", value: "Blake Johnson", confidence: "certain" }],
      subjects,
    );

    expect(flags[0].confidence).toBe("medium");
  });

  it("ignores junk instead of throwing", () => {
    expect(planFlags(null, subjects)).toEqual([]);
    expect(planFlags("nope", subjects)).toEqual([]);
    expect(planFlags([null, 42, {}, { field: 7 }], subjects)).toEqual([]);
  });

  it("skips a table that wasn't part of this scan", () => {
    // A document with no linked payment can still disagree with the project.
    const projectOnly = subjects.filter((s) => s.table === "projects");
    const flags = planFlags(
      [
        { field: "contractor_payments.amount", value: "9999" },
        { field: "projects.client_name", value: "Blake Johnson" },
      ],
      projectOnly,
    );

    expect(flags).toHaveLength(1);
    expect(flags[0].target_table).toBe("projects");
  });
});
