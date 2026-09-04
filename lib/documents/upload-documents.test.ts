import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Regression cases from a 16-file batch upload where only three files landed.
 *
 * Two separate faults produced that: every byte was POSTed through a Vercel
 * function, which rejects bodies over 4.5 MB with a 413 no handler ever sees,
 * and the client loop awaited a helper that threw on a bad response — so the
 * first oversized file aborted the loop and files 4 through 16 were never
 * attempted at all.
 */

const uploadToSignedUrl = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl }) },
  }),
}));

const { uploadProjectDocument, scanProjectDocument } = await import("./upload-documents");

function file(name: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  uploadToSignedUrl.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadProjectDocument", () => {
  it("signs, uploads the bytes directly, then files the record", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith("/upload-url")) {
          return jsonResponse({ path: "p1/123-plans.pdf", token: "tok" });
        }
        return jsonResponse({ id: "doc-1" }, 201);
      }),
    );

    const result = await uploadProjectDocument("p1", file("plans.pdf"), {
      category: "plan",
    });

    expect(result).toEqual({
      file: expect.any(File),
      documentId: "doc-1",
      error: null,
    });
    expect(calls).toEqual([
      "/api/admin/projects/p1/documents/upload-url",
      "/api/admin/projects/p1/documents",
    ]);
    // The bytes go browser → storage. If they ever go through the API again,
    // the 4.5 MB cap comes back with them.
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "p1/123-plans.pdf",
      "tok",
      expect.any(File),
      { contentType: "application/pdf" },
    );
  });

  it("reports a failure instead of throwing, so a batch keeps going", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/upload-url")) {
          return jsonResponse({ path: "p1/123-a.pdf", token: "tok" });
        }
        return jsonResponse({ error: "row rejected" }, 400);
      }),
    );

    const result = await uploadProjectDocument("p1", file("a.pdf"));

    expect(result.documentId).toBeNull();
    expect(result.error).toBe("row rejected");
  });

  it("explains a 413, which arrives with no JSON body to read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Request Entity Too Large", { status: 413 })),
    );

    const result = await uploadProjectDocument("p1", file("huge.pdf"));

    expect(result.documentId).toBeNull();
    expect(result.error).toBe("File is too large to upload");
  });

  it("reports a storage-side failure without throwing", async () => {
    uploadToSignedUrl.mockResolvedValue({ error: { message: "signature expired" } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ path: "p1/123-a.pdf", token: "tok" })),
    );

    const result = await uploadProjectDocument("p1", file("a.pdf"));

    expect(result.documentId).toBeNull();
    expect(result.error).toBe("signature expired");
  });

  it("survives a network error mid-upload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));

    const result = await uploadProjectDocument("p1", file("a.pdf"));

    expect(result).toMatchObject({ documentId: null, error: "offline" });
  });

  it("lets every file in a batch be attempted even when one fails", async () => {
    const attempted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url.endsWith("/upload-url")) {
          const { name } = JSON.parse(init.body as string);
          attempted.push(name);
          return name === "big.pdf"
            ? new Response("too large", { status: 413 })
            : jsonResponse({ path: `p1/1-${name}`, token: "tok" });
        }
        return jsonResponse({ id: "doc" }, 201);
      }),
    );

    const batch = [file("a.pdf"), file("big.pdf"), file("c.pdf")];
    const results = [];
    for (const f of batch) {
      results.push(await uploadProjectDocument("p1", f));
    }

    expect(attempted).toEqual(["a.pdf", "big.pdf", "c.pdf"]);
    expect(results.map((r) => r.documentId)).toEqual(["doc", null, "doc"]);
  });
});

describe("scanProjectDocument", () => {
  it("posts the document id and any reviewed data", async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        body = JSON.parse(init.body as string);
        return jsonResponse({ document_id: "doc-1", flags_raised: 2 });
      }),
    );

    const result = await scanProjectDocument("p1", "doc-1", {
      autoCreatePayment: true,
    });

    expect(result).toEqual({ ok: true, error: null });
    expect(body).toMatchObject({ document_id: "doc-1", auto_create_payment: true });
  });

  it("reports a failed scan rather than throwing — the file is already saved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "model timeout" }, 500)));

    expect(await scanProjectDocument("p1", "doc-1")).toEqual({
      ok: false,
      error: "model timeout",
    });
  });
});
