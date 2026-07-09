import { describe, it, expect } from "vitest";
import {
  canRespond,
  canComplete,
  canMarkPaid,
  canVoid,
  nextStatusFor,
  type BidStatus,
} from "./status";

const ALL: BidStatus[] = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "completed",
  "paid",
  "void",
];

describe("bid status guards", () => {
  it("only allows a response while sent or viewed", () => {
    expect(ALL.filter(canRespond)).toEqual(["sent", "viewed"]);
  });

  it("only allows completion after acceptance", () => {
    expect(ALL.filter(canComplete)).toEqual(["accepted"]);
  });

  it("only allows payment after completion", () => {
    expect(ALL.filter(canMarkPaid)).toEqual(["completed"]);
  });

  it("allows voiding any non-terminal state", () => {
    expect(ALL.filter(canVoid)).toEqual([
      "draft",
      "sent",
      "viewed",
      "accepted",
      "completed",
    ]);
    // declined / paid / void are terminal
    expect(canVoid("declined")).toBe(false);
    expect(canVoid("paid")).toBe(false);
    expect(canVoid("void")).toBe(false);
  });
});

describe("nextStatusFor", () => {
  it("resolves the happy-path lifecycle", () => {
    expect(nextStatusFor("complete", "accepted")).toBe("completed");
    expect(nextStatusFor("paid", "completed")).toBe("paid");
    expect(nextStatusFor("void", "sent")).toBe("void");
  });

  it("rejects out-of-order transitions", () => {
    // can't pay before completing, can't complete before accepting
    expect(nextStatusFor("paid", "accepted")).toBeNull();
    expect(nextStatusFor("complete", "sent")).toBeNull();
    // can't act on terminal states
    expect(nextStatusFor("complete", "declined")).toBeNull();
    expect(nextStatusFor("void", "paid")).toBeNull();
  });
});
