/**
 * /admin/subscribers — newsletter list.
 *
 * Server page; renders a status-filterable list of email subscribers
 * and a CSV export button. No inline edit for v1 — Blake's primary
 * actions are "see the list" and "export to send a campaign elsewhere"
 * (Mailchimp / Resend Broadcasts / etc.). Per-row delete is the only
 * write surface for now and handled via PATCH/DELETE in
 * /api/admin/subscribers/[id] (not built yet — defer until needed).
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

const ALL_STATUS = ["all", "active", "pending", "unsubscribed", "bounced", "spam"] as const;

export default async function SubscribersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = ALL_STATUS.includes(
    sp.status as (typeof ALL_STATUS)[number],
  )
    ? (sp.status as (typeof ALL_STATUS)[number])
    : "active";

  const supabase = await createClient();

  let query = supabase
    .from("email_subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (sp.source) query = query.eq("source", sp.source);

  const { data: subscribers } = await query;

  // Status counts for the pill bar — same pattern as /admin/leads.
  const { data: countRows } = await supabase
    .from("email_subscribers")
    .select("status");
  const statusCounts: Record<string, number> = {};
  for (const row of countRows ?? []) {
    const s = (row as { status: string }).status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  const totalActive = statusCounts.active || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <Mail className="w-6 h-6 text-indigo-500" />
              Subscribers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="text-emerald-700 font-semibold">
                {totalActive} active
              </span>{" "}
              on the newsletter list.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/subscribers/export?status=${statusFilter}${
                sp.source ? `&source=${sp.source}` : ""
              }`}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </a>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>

        {/* Status pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ALL_STATUS.map((s) => {
            const active = s === statusFilter;
            const count = statusCounts[s] || 0;
            return (
              <Link
                key={s}
                href={`/admin/subscribers?status=${s}${sp.source ? `&source=${sp.source}` : ""}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-black text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="capitalize">{s}</span>
                {s !== "all" && count > 0 && (
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

        {/* Subscribers list */}
        {subscribers && subscribers.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="divide-y divide-gray-100">
              {subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      <a
                        href={`mailto:${sub.email}`}
                        className="hover:text-indigo-600"
                      >
                        {sub.email}
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      <span className="capitalize">{sub.source.replace(/_/g, " ")}</span>
                      {" · "}
                      Joined {formatDateTime(sub.created_at)}
                      {sub.unsubscribed_at && (
                        <>
                          {" · "}
                          <span className="text-rose-600">
                            Unsubscribed {formatDateTime(sub.unsubscribed_at)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide self-start ${
                      sub.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : sub.status === "unsubscribed"
                          ? "bg-gray-200 text-gray-600"
                          : sub.status === "bounced"
                            ? "bg-amber-100 text-amber-800"
                            : sub.status === "spam"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Mail className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No subscribers in this view yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
