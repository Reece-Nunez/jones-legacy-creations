import { describe, it, expect } from "vitest";
import {
  canRespond,
  canDecide,
  canComplete,
  canVoid,
  nextStatusFor,
  type BidStatus,
} from "./status";

const ALL: BidStatus[] = [
  "draft",
  "sent",
  "viewed",
  "submitted",
  "passed",
  "accepted",
  "rejected",
  "completed",
  "void",
];

describe("bid status guards", () => {
  it("only allows the contractor to respond while sent or viewed", () => {
    expect(ALL.filter(canRespond)).toEqual(["sent", "viewed"]);
  });

  it("only lets Blake decide once a bid is submitted", () => {
    expect(ALL.filter(canDecide)).toEqual(["submitted"]);
  });

  it("only allows completion after acceptance", () => {
    expect(ALL.filter(canComplete)).toEqual(["accepted"]);
  });

  it("allows voiding any non-terminal state", () => {
    expect(ALL.filter(canVoid)).toEqual([
      "draft",
      "sent",
      "viewed",
      "submitted",
      "accepted",
    ]);
    // passed / rejected / completed / void are terminal
    expect(canVoid("passed")).toBe(false);
    expect(canVoid("rejected")).toBe(false);
    expect(canVoid("completed")).toBe(false);
    expect(canVoid("void")).toBe(false);
  });
});

describe("nextStatusFor", () => {
  it("resolves the happy-path lifecycle", () => {
    expect(nextStatusFor("accept", "submitted")).toBe("accepted");
    expect(nextStatusFor("reject", "submitted")).toBe("rejected");
    expect(nextStatusFor("complete", "accepted")).toBe("completed");
    expect(nextStatusFor("void", "sent")).toBe("void");
  });

  it("rejects out-of-order transitions", () => {
    // can't accept a bid that hasn't been submitted
    expect(nextStatusFor("accept", "viewed")).toBeNull();
    // can't complete before accepting
    expect(nextStatusFor("complete", "submitted")).toBeNull();
    // can't act on terminal states
    expect(nextStatusFor("accept", "passed")).toBeNull();
    expect(nextStatusFor("void", "completed")).toBeNull();
  });
});
