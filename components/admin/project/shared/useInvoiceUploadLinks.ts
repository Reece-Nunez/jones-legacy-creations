"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contractor, InvoiceUploadToken } from "@/lib/types/database";

/**
 * Tokenised invoice-upload links for subcontractors.
 *
 * Lived in duplicate inside PaymentsTab and DrawsTab — the Draws copy is
 * labelled "merged from PaymentsTab" — so the same five handlers existed twice
 * and had to be kept in step by hand.
 */
export function useInvoiceUploadLinks({
  projectId,
  projectName,
  contractors,
}: {
  projectId: string;
  projectName: string;
  contractors: Contractor[];
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<InvoiceUploadToken[]>([]);
  const [contractorId, setContractorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/upload-links`);
      if (res.ok) setLinks(await res.json());
    } catch {
      // Silent: the links panel is supplementary, and failing to load it
      // shouldn't interrupt whatever the user came to the page to do.
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function generate() {
    if (!contractorId) return;
    const contractor = contractors.find((c) => c.id === contractorId);
    if (!contractor) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/upload-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor_id: contractor.id,
          contractor_name: contractor.name,
          project_name: projectName,
        }),
      });
      if (res.ok) {
        await refresh();
        setContractorId("");
      }
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(tokenId: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/upload-links/${tokenId}`,
        { method: "DELETE" },
      );
      if (res.ok) await refresh();
    } finally {
      setLoading(false);
    }
  }

  function copy(token: string, tokenId: string) {
    navigator.clipboard.writeText(linkFor(token));
    setCopiedTokenId(tokenId);
    // Reverts the "Copied" affordance without needing a dismissal.
    setTimeout(() => setCopiedTokenId(null), 2000);
  }

  function text(token: string, contractorName: string, forContractorId: string) {
    const contractor = contractors.find((c) => c.id === forContractorId);
    if (!contractor?.phone) return;
    const firstName = contractorName.split(" ")[0];
    const message = `Hi ${firstName}, please upload your invoice for ${projectName} here: ${linkFor(token)}`;
    window.open(`sms:${contractor.phone}?body=${encodeURIComponent(message)}`);
  }

  function linkFor(token: string) {
    return `${window.location.origin}/submit-invoice/${token}`;
  }

  return {
    open, setOpen,
    links,
    contractorId, setContractorId,
    loading,
    copiedTokenId,
    generate, deactivate, copy, text,
  };
}
