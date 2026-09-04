"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, RefreshCw, ScanSearch, Table2, X } from "lucide-react";
import toast from "react-hot-toast";
import type { DocumentFlag } from "@/lib/types/database";
import { flagFieldFor, FLAG_CATEGORY_LABELS } from "@/lib/documents/flag-fields";
import { formatCurrency as fmt } from "@/lib/formatters";
import { confirmAction } from "@/lib/confirmAction";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditOnly } from "@/components/admin/project/shared/EditContext";

/**
 * Review queue for what the AI found wrong.
 *
 * Fetches its own flags rather than being fed them from the project page: the
 * list changes on upload, on scan, and on every accept/reject, and none of
 * those are worth re-fetching the whole project for.
 */
type ParsedBudgetLine = { line_number: string; description: string; amount: number };
type BudgetImport = {
  id: string;
  name: string;
  parsed_budget: ParsedBudgetLine[] | null;
};

export default function DocumentFlagsPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [flags, setFlags] = useState<DocumentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [budgetImports, setBudgetImports] = useState<BudgetImport[]>([]);
  // Lines the user has unticked in the preview, keyed by document.
  const [droppedLines, setDroppedLines] = useState<Record<string, Set<string>>>({});
  const [importingId, setImportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [flagRes, budgetRes] = await Promise.all([
        fetch(`/api/admin/projects/${projectId}/flags`),
        fetch(`/api/admin/projects/${projectId}/budget-imports`),
      ]);
      if (budgetRes.ok) setBudgetImports(await budgetRes.json());
      if (!flagRes.ok) return;
      setFlags(await flagRes.json());
    } catch {
      // A failed refresh leaves the last good list on screen. The panel is
      // advisory, so there is nothing useful to interrupt the user with.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function scan() {
    setScanning(true);
    const toastId = toast.loading("Reading documents...");
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/flags`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Scan failed", { id: toastId });
        return;
      }
      await load();
      if (body.scanned === 0) {
        toast.success("Every document has already been checked", { id: toastId });
      } else {
        toast.success(
          `Checked ${body.scanned} document${body.scanned === 1 ? "" : "s"} — ${
            body.flagged === 0 ? "nothing to review" : `${body.flagged} to review`
          }`,
          { id: toastId },
        );
      }
    } catch {
      toast.error("Scan failed", { id: toastId });
    } finally {
      setScanning(false);
    }
  }

  async function resolve(flag: DocumentFlag, action: "accept" | "reject") {
    setBusyId(flag.id);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Could not save that");
        return;
      }
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      toast.success(action === "accept" ? "Updated from the document" : "Left as it was");
      // Accepting rewrites a project or payment field, so the rest of the page
      // is now showing stale numbers.
      if (action === "accept") router.refresh();
    } catch {
      toast.error("Could not save that");
    } finally {
      setBusyId(null);
    }
  }

  function toggleLine(documentId: string, lineNumber: string) {
    setDroppedLines((prev) => {
      const dropped = new Set(prev[documentId] ?? []);
      if (dropped.has(lineNumber)) dropped.delete(lineNumber);
      else dropped.add(lineNumber);
      return { ...prev, [documentId]: dropped };
    });
  }

  function keptLines(doc: BudgetImport) {
    const dropped = droppedLines[doc.id] ?? new Set<string>();
    return (doc.parsed_budget ?? []).filter((line) => !dropped.has(line.line_number));
  }

  async function applyBudget(doc: BudgetImport) {
    const lines = keptLines(doc);
    if (lines.length === 0) {
      toast.error("Nothing selected to import");
      return;
    }
    // Importing replaces the whole budget, so the count of what is about to be
    // lost is part of the question rather than a surprise afterwards.
    const confirmed = await confirmAction(
      `Replace this project's budget with ${lines.length} line${lines.length === 1 ? "" : "s"} from ${doc.name}? Existing budget lines will be removed.`,
    );
    if (!confirmed) return;

    setImportingId(doc.id);
    const toastId = toast.loading("Importing budget...");
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/budget-imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: doc.id, lines }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Import failed", { id: toastId });
        return;
      }
      toast.success(`Budget imported — ${lines.length} lines`, { id: toastId });
      await load();
      router.refresh();
    } catch {
      toast.error("Import failed", { id: toastId });
    } finally {
      setImportingId(null);
    }
  }

  async function dismissBudget(doc: BudgetImport) {
    setImportingId(doc.id);
    try {
      await fetch(
        `/api/admin/projects/${projectId}/budget-imports?document_id=${encodeURIComponent(doc.id)}`,
        { method: "DELETE" },
      );
      await load();
      toast.success("Budget dismissed");
    } catch {
      toast.error("Could not dismiss");
    } finally {
      setImportingId(null);
    }
  }

  if (loading) return null;

  // Grouped by document, because that is how they get reviewed: open the
  // invoice, settle everything it disagrees about, move on.
  const byDocument = new Map<string, DocumentFlag[]>();
  for (const flag of flags) {
    const existing = byDocument.get(flag.document_id);
    if (existing) existing.push(flag);
    else byDocument.set(flag.document_id, [flag]);
  }

  const reviewCount = flags.length + budgetImports.length;

  return (
    <ShadCard className={reviewCount > 0 ? "border-amber-200 bg-amber-50/30" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className={`text-sm font-medium ${reviewCount > 0 ? "text-amber-800" : "text-gray-600"}`}>
            {reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Document review ({reviewCount})
              </span>
            ) : (
              "Document review — nothing to look at"
            )}
          </CardTitle>
          <EditOnly>
            <button
              onClick={scan}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              style={{ minHeight: 36 }}
              title="Read every document that has not been checked yet"
            >
              {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
              {scanning ? "Reading..." : "Scan documents"}
            </button>
          </EditOnly>
        </div>
      </CardHeader>

      {budgetImports.length > 0 && (
        <CardContent className="space-y-3 pb-0">
          {budgetImports.map((doc) => {
            const lines = doc.parsed_budget ?? [];
            const dropped = droppedLines[doc.id] ?? new Set<string>();
            const kept = lines.filter((l) => !dropped.has(l.line_number));
            const total = kept.reduce((sum, l) => sum + (l.amount || 0), 0);

            return (
              <div key={doc.id} className="rounded-lg border border-indigo-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 inline-flex items-center gap-1.5">
                      <Table2 className="w-4 h-4 text-indigo-500" />
                      Budget found in {doc.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {kept.length} of {lines.length} line{lines.length === 1 ? "" : "s"} selected
                      {" · "}
                      <span className="font-semibold text-gray-700 tabular-nums">{fmt(total)}</span>
                      {" · importing replaces the current budget"}
                    </p>
                  </div>
                  <EditOnly>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={importingId === doc.id || kept.length === 0}
                        onClick={() => applyBudget(doc)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        style={{ minHeight: 36 }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Import budget
                      </button>
                      <button
                        disabled={importingId === doc.id}
                        onClick={() => dismissBudget(doc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        style={{ minHeight: 36 }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </div>
                  </EditOnly>
                </div>

                <div className="max-h-64 overflow-y-auto rounded border border-gray-100">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line) => {
                        const kept = !dropped.has(line.line_number);
                        return (
                          <tr key={line.line_number} className={kept ? "" : "opacity-40"}>
                            <td className="py-1.5 pl-2 pr-1 w-8">
                              <input
                                type="checkbox"
                                checked={kept}
                                onChange={() => toggleLine(doc.id, line.line_number)}
                                aria-label={`Include line ${line.line_number} ${line.description}`}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="py-1.5 pr-2 text-gray-400 tabular-nums w-10">{line.line_number}</td>
                            <td className="py-1.5 pr-2 text-gray-800">{line.description}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums text-gray-700 w-24">
                              {line.amount > 0 ? fmt(line.amount) : "--"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}

      {flags.length > 0 && (
        <CardContent className="space-y-4">
          {Array.from(byDocument.entries()).map(([documentId, docFlags]) => (
            <div key={documentId}>
              <p className="text-xs font-semibold text-gray-700 mb-1.5 truncate">
                {docFlags[0].document?.name || "Document"}
              </p>
              <div className="space-y-2">
                {docFlags.map((flag) => {
                  const field = flagFieldFor(flag.target_table, flag.target_field);
                  return (
                    <div key={flag.id} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {field?.label || flag.target_field}
                            </span>
                            <Badge variant="outline" className="rounded-full text-[10px] text-gray-500">
                              {FLAG_CATEGORY_LABELS[flag.category]}
                            </Badge>
                            {flag.confidence === "low" && (
                              <Badge
                                variant="outline"
                                className="rounded-full bg-gray-100 text-gray-600 text-[10px]"
                                title="The AI was not confident reading this — check the document before accepting"
                              >
                                Unsure
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            <span className="line-through text-gray-400">
                              {flag.current_value || "(blank)"}
                            </span>
                            <span className="mx-1.5 text-gray-400">&rarr;</span>
                            <span className="font-semibold text-gray-900">{flag.suggested_value}</span>
                          </p>
                          {flag.explanation && (
                            <p className="text-[11px] text-gray-500 mt-1">{flag.explanation}</p>
                          )}
                        </div>
                        <EditOnly>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              disabled={busyId === flag.id}
                              onClick={() => resolve(flag, "accept")}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
                              style={{ minHeight: 36 }}
                              title="Use the value from the document"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={busyId === flag.id}
                              onClick={() => resolve(flag, "reject")}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                              style={{ minHeight: 36 }}
                              title="Keep what we have"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </EditOnly>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </ShadCard>
  );
}
