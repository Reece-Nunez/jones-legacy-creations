import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  Project,
  Invoice,
  ContractorPayment,
  DrawRequest,
  DrawRequestStatus,
} from "@/lib/types/database";
import { DRAW_STATUS_COLORS } from "@/lib/types/database";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Inbox,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const pct = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);

/** Spoken-format dollar amount for aria-label, e.g. "$1,234.56" -> "1234 dollars and 56 cents" */
function spokenDollars(n: number): string {
  const abs = Math.abs(n);
  const dollars = Math.floor(abs);
  const cents = Math.round((abs - dollars) * 100);
  const neg = n < 0 ? "negative " : "";
  if (cents === 0) {
    return `${neg}${dollars} dollars`;
  }
  return `${neg}${dollars} dollars and ${cents} cents`;
}

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await searchParams; // consume to satisfy Next.js

  const supabase = await createClient();

  const [projectsRes, invoicesRes, paymentsRes, drawsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("invoices").select("*"),
    supabase.from("contractor_payments").select("*"),
    supabase.from("draw_requests").select("*"),
  ]);

  const projects: Project[] = projectsRes.data ?? [];
  const invoices: Invoice[] = invoicesRes.data ?? [];
  const payments: ContractorPayment[] = paymentsRes.data ?? [];
  const draws: DrawRequest[] = drawsRes.data ?? [];

  // ── Maps ─────────────────────────────────────────────────────────
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // ── Summary Numbers ──────────────────────────────────────────────
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");

  const totalRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0);
  const outstandingTotal = unpaidInvoices.reduce((s, i) => s + i.amount, 0);

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const paidPayments = payments.filter((p) => p.status === "paid");
  const owedToContractors = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const paidToContractors = paidPayments.reduce((s, p) => s + p.amount, 0);

  const netPosition = totalRevenue - paidToContractors;

  // ── Active Projects (not archived) ──────────────────────────────
  const activeProjects = projects.filter((p) => p.status !== "archived");

  // ── Per-project financials ──────────────────────────────────────
  interface ProjectFinancials {
    project: Project;
    contractValue: number;
    totalInvoiced: number;
    totalCollected: number;
    totalCosts: number;
    pendingCosts: number;
    profitMargin: number;
    drawsFunded: number;
    drawsPending: number;
  }

  const projectFinancials: ProjectFinancials[] = activeProjects.map((p) => {
    const projInvoices = invoices.filter((i) => i.project_id === p.id);
    const projPayments = payments.filter((pm) => pm.project_id === p.id);
    const projDraws = draws.filter((d) => d.project_id === p.id);

    const totalInvoiced = projInvoices.reduce((s, i) => s + i.amount, 0);
    const totalCollected = projInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount, 0);
    const totalCosts = projPayments
      .filter((pm) => pm.status === "paid")
      .reduce((s, pm) => s + pm.amount, 0);
    const pendingCosts = projPayments
      .filter((pm) => pm.status === "pending")
      .reduce((s, pm) => s + pm.amount, 0);
    const drawsFunded = projDraws
      .filter((d) => d.status === "funded")
      .reduce((s, d) => s + d.amount, 0);
    const drawsPending = projDraws
      .filter((d) => d.status !== "funded" && d.status !== "denied")
      .reduce((s, d) => s + d.amount, 0);

    return {
      project: p,
      contractValue: p.contract_value ?? p.estimated_value ?? 0,
      totalInvoiced,
      totalCollected,
      totalCosts,
      pendingCosts,
      profitMargin: totalCollected - totalCosts,
      drawsFunded,
      drawsPending,
    };
  });

  // Sort: projects with activity first, then by profit descending
  projectFinancials.sort((a, b) => {
    const aHasActivity = a.totalInvoiced + a.totalCosts > 0;
    const bHasActivity = b.totalInvoiced + b.totalCosts > 0;
    if (aHasActivity !== bHasActivity) return aHasActivity ? -1 : 1;
    return b.profitMargin - a.profitMargin;
  });

  // ── Upcoming Payments (next 30 days) ────────────────────────────
  const today = new Date();
  const thirtyDaysOut = new Date(today.getTime() + 30 * 86_400_000);

  interface UpcomingItem {
    date: string;
    type: "invoice" | "payment";
    projectName: string;
    projectId: string;
    name: string; // client or contractor
    amount: number;
    daysAway: number;
  }

  const upcomingItems: UpcomingItem[] = [];

  for (const inv of invoices) {
    if (inv.status === "paid" || !inv.due_date) continue;
    const d = new Date(inv.due_date);
    if (d <= thirtyDaysOut) {
      const proj = projectMap.get(inv.project_id);
      upcomingItems.push({
        date: inv.due_date,
        type: "invoice",
        projectName: proj?.name ?? "Unknown",
        projectId: inv.project_id,
        name: proj?.client_name ?? "Unknown",
        amount: inv.amount,
        daysAway: daysUntil(inv.due_date),
      });
    }
  }

  for (const pm of payments) {
    if (pm.status === "paid" || !pm.due_date) continue;
    const d = new Date(pm.due_date);
    if (d <= thirtyDaysOut) {
      const proj = projectMap.get(pm.project_id);
      upcomingItems.push({
        date: pm.due_date,
        type: "payment",
        projectName: proj?.name ?? "Unknown",
        projectId: pm.project_id,
        name: pm.contractor_name,
        amount: pm.amount,
        daysAway: daysUntil(pm.due_date),
      });
    }
  }

  upcomingItems.sort((a, b) => a.date.localeCompare(b.date));

  // ── Draw Requests by Project ────────────────────────────────────
  const drawsByProject = new Map<
    string,
    { project: Project; draws: DrawRequest[] }
  >();
  for (const d of draws) {
    const proj = projectMap.get(d.project_id);
    if (!proj) continue;
    if (!drawsByProject.has(d.project_id)) {
      drawsByProject.set(d.project_id, { project: proj, draws: [] });
    }
    drawsByProject.get(d.project_id)!.draws.push(d);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Financial Overview
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete picture of revenue, costs, and cash flow
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* ── A. Summary Cards ──────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total Revenue */}
          <div className="rounded-xl border-t-4 border-green-500 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Total Revenue
              </span>
            </div>
            <p
              className="mt-3 text-3xl font-bold tabular-nums text-green-700"
              aria-label={spokenDollars(totalRevenue)}
            >
              {fmt(totalRevenue)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {paidInvoices.length} paid invoice
              {paidInvoices.length !== 1 && "s"}
            </p>
          </div>

          {/* Outstanding */}
          <div className="rounded-xl border-t-4 border-blue-500 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Outstanding
              </span>
            </div>
            <p
              className="mt-3 text-3xl font-bold tabular-nums text-blue-700"
              aria-label={spokenDollars(outstandingTotal)}
            >
              {fmt(outstandingTotal)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {unpaidInvoices.length} unpaid invoice
              {unpaidInvoices.length !== 1 && "s"}
              {overdueInvoices.length > 0 && (
                <span className="ml-1 font-medium text-red-500">
                  ({overdueInvoices.length} overdue)
                </span>
              )}
            </p>
          </div>

          {/* Owed to Contractors */}
          <div className="rounded-xl border-t-4 border-orange-500 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Owed to Contractors
              </span>
            </div>
            <p
              className="mt-3 text-3xl font-bold tabular-nums text-orange-700"
              aria-label={spokenDollars(owedToContractors)}
            >
              {fmt(owedToContractors)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {pendingPayments.length} pending payment
              {pendingPayments.length !== 1 && "s"}
            </p>
          </div>

          {/* Net Position */}
          <div
            className={`rounded-xl border-t-4 bg-white p-6 shadow-sm ${
              netPosition >= 0 ? "border-green-500" : "border-red-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg p-2 ${
                  netPosition >= 0 ? "bg-green-50" : "bg-red-50"
                }`}
              >
                {netPosition >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">
                Net Position
              </span>
            </div>
            <p
              className={`mt-3 text-3xl font-bold tabular-nums ${
                netPosition >= 0 ? "text-green-700" : "text-red-700"
              }`}
              aria-label={spokenDollars(netPosition)}
            >
              {fmt(netPosition)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Revenue minus paid costs
            </p>
          </div>
        </div>

        {/* ── Section Divider ─────────────────────────────────────── */}
        <hr className="mb-8 border-gray-200" />

        {/* ── B. Overdue Invoices Alert ──────────────────────────── */}
        {overdueInvoices.length > 0 && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-red-200 bg-gradient-to-br from-red-50 via-red-50 to-orange-50 p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-800">
                Overdue Invoices ({overdueInvoices.length})
              </h2>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-200 text-left">
                    <th scope="col" className="pb-2 pr-4 font-semibold text-gray-900">Client</th>
                    <th scope="col" className="pb-2 pr-4 font-semibold text-gray-900">Project</th>
                    <th scope="col" className="pb-2 pr-4 font-semibold text-gray-900">Invoice #</th>
                    <th scope="col" className="pb-2 pr-4 text-right font-semibold text-gray-900">Amount</th>
                    <th scope="col" className="pb-2 pr-4 text-right font-semibold text-gray-900">
                      Days Overdue
                    </th>
                    <th scope="col" className="pb-2 font-semibold text-gray-900">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overdueInvoices.map((inv) => {
                    const proj = projectMap.get(inv.project_id);
                    const days = daysOverdue(inv.due_date);
                    return (
                      <tr
                        key={inv.id}
                        className="min-h-[44px] border-b border-red-100 last:border-0"
                      >
                        <th scope="row" className="py-3 pr-4 text-left font-medium text-red-900">
                          {proj?.client_name ?? "Unknown"}
                        </th>
                        <td className="py-3 pr-4 text-gray-700">
                          {proj?.name ?? "Unknown"}
                        </td>
                        <td className="py-3 pr-4 tabular-nums text-gray-700">
                          {inv.invoice_number}
                        </td>
                        <td
                          className="py-3 pr-4 text-right tabular-nums font-semibold text-red-900"
                          aria-label={spokenDollars(inv.amount)}
                        >
                          {fmt(inv.amount)}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <span className="inline-flex items-center rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold text-red-800">
                            {days} day{days !== 1 && "s"}
                          </span>
                        </td>
                        <td className="py-3">
                          {proj && (
                            <Link
                              href={`/admin/projects/${proj.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900"
                              aria-label={`View overdue invoice for project ${proj.name}`}
                            >
                              View project
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="space-y-3 md:hidden">
              {overdueInvoices.map((inv) => {
                const proj = projectMap.get(inv.project_id);
                const days = daysOverdue(inv.due_date);
                return (
                  <div
                    key={inv.id}
                    className="rounded-lg border border-red-200 bg-white/80 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-red-900">
                        {proj?.client_name ?? "Unknown"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold text-red-800">
                        {days} day{days !== 1 && "s"} overdue
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{proj?.name ?? "Unknown"}</p>
                    <p className="text-xs tabular-nums text-gray-500">Invoice {inv.invoice_number}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className="text-lg font-bold tabular-nums text-red-900"
                        aria-label={spokenDollars(inv.amount)}
                      >
                        {fmt(inv.amount)}
                      </span>
                      {proj && (
                        <Link
                          href={`/admin/projects/${proj.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900"
                          aria-label={`View overdue invoice for project ${proj.name}`}
                        >
                          View project
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Section Divider ─────────────────────────────────────── */}
        <hr className="mb-8 border-gray-200" />

        {/* ── C. Project Financial Breakdown ─────────────────────── */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Project Financial Breakdown
          </h2>

          {projectFinancials.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <Inbox className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No active projects with financial data
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="relative hidden overflow-x-auto rounded-xl bg-white shadow-sm md:block">
                {/* Scroll indicator gradient on right edge */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/80 to-transparent lg:hidden" />
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-gray-200 text-left">
                        <th scope="col" className="px-4 py-3 font-semibold text-gray-900">Project</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                          Contract Value
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">Invoiced</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                          Collected
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                          Costs (Paid)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                          Costs (Pending)
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">Profit</th>
                        <th scope="col" className="hidden px-4 py-3 text-right font-semibold text-gray-900 lg:table-cell">
                          Draws
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectFinancials.map((pf) => {
                        const marginPct =
                          pf.totalCollected > 0
                            ? pf.profitMargin / pf.totalCollected
                            : 0;
                        const profitable = pf.profitMargin >= 0;

                        return (
                          <tr
                            key={pf.project.id}
                            className="min-h-[44px] border-b border-gray-100 last:border-0 even:bg-gray-50 hover:bg-gray-100"
                          >
                            <th scope="row" className="px-4 py-3 text-left">
                              <Link
                                href={`/admin/projects/${pf.project.id}`}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                                aria-label={`View financials for project ${pf.project.name}`}
                              >
                                {pf.project.name}
                              </Link>
                              <p className="text-xs text-gray-500">
                                {pf.project.client_name}
                              </p>
                            </th>
                            <td
                              className="px-4 py-3 text-right tabular-nums font-medium text-gray-700"
                              aria-label={pf.contractValue > 0 ? spokenDollars(pf.contractValue) : undefined}
                            >
                              {pf.contractValue > 0
                                ? fmt(pf.contractValue)
                                : "--"}
                            </td>
                            <td
                              className="px-4 py-3 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.totalInvoiced)}
                            >
                              {fmt(pf.totalInvoiced)}
                            </td>
                            <td
                              className="px-4 py-3 text-right tabular-nums font-medium text-green-700"
                              aria-label={spokenDollars(pf.totalCollected)}
                            >
                              {fmt(pf.totalCollected)}
                            </td>
                            <td
                              className="px-4 py-3 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.totalCosts)}
                            >
                              {fmt(pf.totalCosts)}
                            </td>
                            <td
                              className="px-4 py-3 text-right tabular-nums text-blue-600"
                              aria-label={pf.pendingCosts > 0 ? spokenDollars(pf.pendingCosts) : undefined}
                            >
                              {pf.pendingCosts > 0 ? fmt(pf.pendingCosts) : "--"}
                            </td>
                            <td
                              className={`px-4 py-3 text-right tabular-nums font-semibold ${
                                profitable ? "text-green-700" : "text-red-700"
                              }`}
                              aria-label={spokenDollars(pf.profitMargin)}
                            >
                              <span className="inline-flex items-center gap-1">
                                {profitable ? (
                                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                                )}
                                {fmt(pf.profitMargin)}
                              </span>
                            </td>
                            <td className="hidden px-4 py-3 text-right lg:table-cell">
                              {pf.drawsFunded + pf.drawsPending > 0 ? (
                                <span className="text-xs tabular-nums text-gray-700">
                                  <span className="font-medium text-green-700">
                                    {fmt(pf.drawsFunded)}
                                  </span>
                                  {pf.drawsPending > 0 && (
                                    <>
                                      {" / "}
                                      <span className="text-blue-600">
                                        {fmt(pf.drawsPending)}
                                      </span>
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-500">--</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {pf.totalCollected > 0 ? (
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    profitable
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {pct(marginPct)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">--</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card layout */}
              <div className="space-y-3 md:hidden">
                {projectFinancials.map((pf) => {
                  const marginPct =
                    pf.totalCollected > 0
                      ? pf.profitMargin / pf.totalCollected
                      : 0;
                  const profitable = pf.profitMargin >= 0;

                  return (
                    <div
                      key={pf.project.id}
                      className="rounded-xl bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <Link
                            href={`/admin/projects/${pf.project.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                            aria-label={`View financials for project ${pf.project.name}`}
                          >
                            {pf.project.name}
                          </Link>
                          <p className="text-xs text-gray-500">{pf.project.client_name}</p>
                        </div>
                        {pf.totalCollected > 0 && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              profitable
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {pct(marginPct)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Contract</p>
                          <p className="tabular-nums font-medium text-gray-700" aria-label={pf.contractValue > 0 ? spokenDollars(pf.contractValue) : undefined}>
                            {pf.contractValue > 0 ? fmt(pf.contractValue) : "--"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Collected</p>
                          <p className="tabular-nums font-medium text-green-700" aria-label={spokenDollars(pf.totalCollected)}>
                            {fmt(pf.totalCollected)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Costs</p>
                          <p className="tabular-nums text-gray-700" aria-label={spokenDollars(pf.totalCosts)}>
                            {fmt(pf.totalCosts)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Profit</p>
                          <p
                            className={`tabular-nums font-semibold ${profitable ? "text-green-700" : "text-red-700"}`}
                            aria-label={spokenDollars(pf.profitMargin)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {profitable ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {fmt(pf.profitMargin)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Section Divider ─────────────────────────────────────── */}
        <hr className="mb-8 border-gray-200" />

        {/* ── D. Upcoming Payments Due ───────────────────────────── */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Upcoming Payments Due{" "}
            <span className="text-sm font-normal text-gray-500">
              (next 30 days)
            </span>
          </h2>
          {upcomingItems.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="relative hidden overflow-x-auto rounded-xl bg-white shadow-sm md:block">
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/80 to-transparent lg:hidden" />
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900">Due Date</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900">Type</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900">Project</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-gray-900">Client / Contractor</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">Amount</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingItems.map((item, idx) => {
                      const isOverdue = item.daysAway < 0;
                      const isDueSoon =
                        item.daysAway >= 0 && item.daysAway <= 7;

                      return (
                        <tr
                          key={`${item.type}-${idx}`}
                          className={`min-h-[44px] border-b border-gray-100 last:border-0 even:bg-gray-50 ${
                            isOverdue ? "!bg-red-50/50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span
                                className={
                                  isOverdue
                                    ? "font-medium text-red-700"
                                    : "text-gray-700"
                                }
                              >
                                {formatDate(item.date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {item.type === "invoice" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <FileText className="h-3 w-3" />
                                Invoice
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                                <CreditCard className="h-3 w-3" />
                                Payment
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/projects/${item.projectId}`}
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                              aria-label={`View upcoming ${item.type} for project ${item.projectName}`}
                            >
                              {item.projectName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.name}
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900"
                            aria-label={spokenDollars(item.amount)}
                          >
                            {fmt(item.amount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                <Clock className="h-3 w-3" />
                                {Math.abs(item.daysAway)}d overdue
                              </span>
                            ) : isDueSoon ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                                <Clock className="h-3 w-3" />
                                {item.daysAway === 0
                                  ? "Today"
                                  : `${item.daysAway}d`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {item.daysAway}d
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile timeline layout */}
              <div className="space-y-0 md:hidden">
                {upcomingItems.map((item, idx) => {
                  const isOverdue = item.daysAway < 0;
                  const isDueSoon =
                    item.daysAway >= 0 && item.daysAway <= 7;

                  return (
                    <div
                      key={`${item.type}-${idx}`}
                      className="relative flex gap-4 pb-4"
                    >
                      {/* Timeline line and dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`mt-1.5 h-3 w-3 rounded-full ring-2 ring-white ${
                            isOverdue
                              ? "bg-red-500"
                              : isDueSoon
                              ? "bg-yellow-500"
                              : "bg-gray-300"
                          }`}
                        />
                        {idx < upcomingItems.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200" />
                        )}
                      </div>
                      {/* Card */}
                      <div
                        className={`flex-1 rounded-lg border p-3 ${
                          isOverdue
                            ? "border-red-200 bg-red-50/50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDate(item.date)}
                          </span>
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              <Clock className="h-3 w-3" />
                              {Math.abs(item.daysAway)}d overdue
                            </span>
                          ) : isDueSoon ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
                              {item.daysAway === 0 ? "Today" : `${item.daysAway}d`}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">{item.daysAway}d</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Link
                              href={`/admin/projects/${item.projectId}`}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                              aria-label={`View upcoming ${item.type} for project ${item.projectName}`}
                            >
                              {item.projectName}
                            </Link>
                            <p className="text-xs text-gray-500">{item.name}</p>
                          </div>
                          <span
                            className="text-sm tabular-nums font-semibold text-gray-900"
                            aria-label={spokenDollars(item.amount)}
                          >
                            {fmt(item.amount)}
                          </span>
                        </div>
                        <div className="mt-1">
                          {item.type === "invoice" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              <FileText className="h-3 w-3" />
                              Invoice
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                              <CreditCard className="h-3 w-3" />
                              Payment
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <Calendar className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No upcoming payments due in the next 30 days
              </p>
            </div>
          )}
        </div>

        {/* ── Section Divider ─────────────────────────────────────── */}
        <hr className="mb-8 border-gray-200" />

        {/* ── E. Draw Request Summary ────────────────────────────── */}
        {draws.length > 0 ? (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Draw Request Summary
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(drawsByProject.values()).map(
                ({ project, draws: projDraws }) => {
                  const funded = projDraws
                    .filter((d) => d.status === "funded")
                    .reduce((s, d) => s + d.amount, 0);
                  const pending = projDraws
                    .filter(
                      (d) => d.status !== "funded" && d.status !== "denied"
                    )
                    .reduce((s, d) => s + d.amount, 0);

                  return (
                    <div
                      key={project.id}
                      className="rounded-xl bg-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-500"
                          aria-label={`View draw requests for project ${project.name}`}
                        >
                          {project.name}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {projDraws.length} draw
                          {projDraws.length !== 1 && "s"}
                        </span>
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Funded</p>
                          <p
                            className="text-lg font-bold tabular-nums text-green-700"
                            aria-label={spokenDollars(funded)}
                          >
                            {fmt(funded)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Pending</p>
                          <p
                            className="text-lg font-bold tabular-nums text-blue-600"
                            aria-label={spokenDollars(pending)}
                          >
                            {fmt(pending)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-gray-100 pt-3">
                        {projDraws.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 font-medium ${
                                  DRAW_STATUS_COLORS[
                                    d.status as DrawRequestStatus
                                  ]
                                }`}
                              >
                                {d.status}
                              </span>
                              <span className="text-gray-700">
                                Draw #{d.draw_number}
                              </span>
                            </div>
                            <span
                              className="font-semibold tabular-nums text-gray-700"
                              aria-label={spokenDollars(d.amount)}
                            >
                              {fmt(d.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Draw Request Summary
            </h2>
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No draw requests yet
              </p>
            </div>
          </div>
        )}

        {/* ── Footer Quick Nav ───────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 pt-4 text-sm">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
            aria-label="Navigate to admin dashboard"
          >
            Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
            aria-label="Navigate to all projects"
          >
            Projects
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
