import { describe, it, expect } from "vitest";
import { isProjectStoragePath, parseStorageUrl } from "./storagePath";
import { fileDownloadUrl } from "../fileDownloadUrl";

const ORIGIN = "https://rvyummgsvggjqtjbtqfw.supabase.co";

// The document that surfaced this: uploaded to lot 42 on 2026-08-20. Its
// object key contains literal spaces, so the stored URL carries %20.
const LOT42_URL = `${ORIGIN}/storage/v1/object/public/project-documents/730df9a0-a108-4d46-92f4-d7615b959384/1787244886143-LOT%2042_Deed%20of%20Trust.pdf`;
const LOT42_KEY =
  "730df9a0-a108-4d46-92f4-d7615b959384/1787244886143-LOT 42_Deed of Trust.pdf";

describe("parseStorageUrl", () => {
  it("returns null for empty input", () => {
    expect(parseStorageUrl(null)).toBeNull();
    expect(parseStorageUrl(undefined)).toBeNull();
    expect(parseStorageUrl("")).toBeNull();
  });

  it("returns null for a non-storage URL", () => {
    expect(parseStorageUrl("https://example.com/some/file.pdf")).toBeNull();
    expect(parseStorageUrl("not a url")).toBeNull();
  });

  it("returns null when there is a bucket but no object path", () => {
    expect(
      parseStorageUrl(`${ORIGIN}/storage/v1/object/public/project-documents`),
    ).toBeNull();
  });

  it("decodes the key so it matches storage.objects.name exactly", () => {
    // The bug: this used to return the %20 form, which matches no object.
    expect(parseStorageUrl(LOT42_URL)).toEqual({
      bucket: "project-documents",
      path: LOT42_KEY,
    });
  });

  it("handles all three stored URL shapes", () => {
    const tail = "project-documents/abc/file name.pdf";
    const expected = { bucket: "project-documents", path: "abc/file name.pdf" };

    // Pre-lockdown public URL
    expect(
      parseStorageUrl(`${ORIGIN}/storage/v1/object/public/${encodeURI(tail)}`),
    ).toEqual(expected);
    // Post-lockdown
    expect(
      parseStorageUrl(`${ORIGIN}/storage/v1/object/${encodeURI(tail)}`),
    ).toEqual(expected);
    // Signed (token in the query string must not leak into the key)
    expect(
      parseStorageUrl(
        `${ORIGIN}/storage/v1/object/sign/${encodeURI(tail)}?token=abc.def`,
      ),
    ).toEqual(expected);
  });

  it("decodes characters beyond the space", () => {
    const url = `${ORIGIN}/storage/v1/object/public/project-documents/x/50%25%20deposit%20%232.pdf`;
    expect(parseStorageUrl(url)?.path).toBe("x/50% deposit #2.pdf");
  });

  it("keeps nested folders intact", () => {
    const url = `${ORIGIN}/storage/v1/object/public/contractor-w9/abc/insurance/policy.pdf`;
    expect(parseStorageUrl(url)).toEqual({
      bucket: "contractor-w9",
      path: "abc/insurance/policy.pdf",
    });
  });

  it("falls back to the raw segment on a malformed escape instead of throwing", () => {
    // A stray "%" would make decodeURIComponent throw; the page that renders
    // this link shouldn't crash over one bad row.
    const url = `${ORIGIN}/storage/v1/object/public/project-documents/x/100%.pdf`;
    expect(() => parseStorageUrl(url)).not.toThrow();
    expect(parseStorageUrl(url)?.path).toBe("x/100%.pdf");
  });
});

describe("fileDownloadUrl", () => {
  it("returns empty string for empty input", () => {
    expect(fileDownloadUrl(null)).toBe("");
    expect(fileDownloadUrl(undefined)).toBe("");
    expect(fileDownloadUrl("")).toBe("");
  });

  it("passes non-storage URLs straight through", () => {
    const cdn = "https://cdn.example.com/a.png";
    expect(fileDownloadUrl(cdn)).toBe(cdn);
  });

  it("round-trips to the exact storage key the server will use", () => {
    // This is the contract that matters: whatever the server reads out of
    // searchParams must equal the real object key, with no leftover encoding.
    const href = fileDownloadUrl(LOT42_URL);
    const params = new URL(href, "https://app.test").searchParams;
    expect(params.get("bucket")).toBe("project-documents");
    expect(params.get("path")).toBe(LOT42_KEY);
  });

  it("no longer double-encodes spaces", () => {
    const href = fileDownloadUrl(LOT42_URL);
    expect(href).not.toContain("%2520");
    expect(href).toContain("%20");
  });

  it("round-trips keys containing +, #, ? and % unchanged", () => {
    // "+" is the dangerous one: in a query string it decodes to a space, so
    // it must be percent-escaped on the way out.
    for (const key of [
      "p/a+b.pdf",
      "p/note #4.pdf",
      "p/what?.pdf",
      "p/50% off.pdf",
      "p/a&b=c.pdf",
    ]) {
      const url = `${ORIGIN}/storage/v1/object/public/project-documents/${encodeURIComponent(key)}`;
      const href = fileDownloadUrl(url);
      const params = new URL(href, "https://app.test").searchParams;
      expect(params.get("path")).toBe(key);
    }
  });
});

describe("isProjectStoragePath", () => {
  const project = "f7cdba0a-f51e-4baf-9312-babf39e00ccc";

  it("accepts a key minted under the project prefix", () => {
    expect(
      isProjectStoragePath(`${project}/1757030000000-invoice.pdf`, project),
    ).toBe(true);
  });

  it("accepts keys with spaces and dots in the filename", () => {
    expect(
      isProjectStoragePath(`${project}/1757030000000-Draw 3 (final).v2.pdf`, project),
    ).toBe(true);
  });

  it("rejects another project's file", () => {
    expect(
      isProjectStoragePath("11111111-2222-3333-4444-555555555555/1-a.pdf", project),
    ).toBe(false);
  });

  it("rejects a prefix that only looks like the project id", () => {
    expect(isProjectStoragePath(`${project}-other/1-a.pdf`, project)).toBe(false);
  });

  it("rejects traversal out of the project folder", () => {
    expect(isProjectStoragePath(`${project}/../other/1-a.pdf`, project)).toBe(false);
  });

  it("rejects a bare project id with no file", () => {
    expect(isProjectStoragePath(project, project)).toBe(false);
  });

  it("rejects empty input", () => {
    expect(isProjectStoragePath("", project)).toBe(false);
    expect(isProjectStoragePath(`${project}/a.pdf`, "")).toBe(false);
  });
});
