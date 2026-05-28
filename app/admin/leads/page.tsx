/**
 * /admin/leads — lead triage page.
 *
 * Every public form (contact, construction, real-estate, interior-design)
 * dual-writes here BEFORE Resend, so this is the source of truth for
 * "did we lose a lead?" — Resend failures no longer make a lead vanish.
 *
 * Workflow:
 *   new → contacted → qualified → won / lost
 *   (or: → spam)
 *
 * Bulk actions intentionally absent for v1 — Blake will work leads
 * one at a time. Per-lead inline status dropdown + expandable
 * raw_payload viewer is enough.
 */

import { createClient } from "@/lib/supabase/server";
import LeadsTable from "@/components/admin/LeadsTable";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const ALL_STATUS = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
const ALL_SOURCE = [
  "contact",
  "construction",
  "real_estate",
  "interior_design",
  "newsletter",
  "other",
] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = ALL_STATUS.includes(sp.status as (typeof ALL_STATUS)[number])
    ? (sp.status as (typeof ALL_STATUS)[number])
    : "new";
  const sourceFilter = ALL_SOURCE.includes(sp.source as (typeof ALL_SOURCE)[number])
    ? (sp.source as (typeof ALL_SOURCE)[number])
    : null;

  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (sourceFilter) query = query.eq("source", sourceFilter);

  const { data: leads } = await query;

  // Get per-status counts for the filter tabs so Blake knows at a
  // glance how many `new` leads need work.
  const { data: counts } = await supabase
    .from("leads")
    .select("status")
    .order("status");
  const statusCounts: Record<string, number> = {};
  for (const row of counts ?? []) {
    const s = (row as { status: string }).status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="mt-1 text-sm text-gray-500">
              Every web form submission. New &rarr; Contacted &rarr; Qualified &rarr; Won / Lost.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Status filter pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ALL_STATUS.map((s) => {
            const active = s === statusFilter;
            const count = statusCounts[s] || 0;
            return (
              <Link
                key={s}
                href={`/admin/leads?status=${s}${sourceFilter ? `&source=${sourceFilter}` : ""}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-black text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="capitalize">{s}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-white/20" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Source filter dropdown */}
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-600">
          <span>Source:</span>
          <Link
            href={`/admin/leads?status=${statusFilter}`}
            className={`rounded px-2 py-0.5 ${
              !sourceFilter ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            all
          </Link>
          {ALL_SOURCE.map((src) => (
            <Link
              key={src}
              href={`/admin/leads?status=${statusFilter}&source=${src}`}
              className={`rounded px-2 py-0.5 ${
                sourceFilter === src ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {src.replace(/_/g, " ")}
            </Link>
          ))}
        </div>

        <LeadsTable leads={leads ?? []} />
      </div>
    </div>
  );
}
