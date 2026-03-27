import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  Project,
  ContractorPayment,
  DrawRequest,
  DrawRequestStatus,
} from "@/lib/types/database";
import { DRAW_STATUS_COLORS } from "@/lib/types/database";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  Clock,
  FileText,
  ExternalLink,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Calculate accrued interest for a project's funded draws (same logic as ProjectDetail) */
function calcAccruedInterest(
  project: Project,
  projectDraws: DrawRequest[]
): number {
  const interestRate = project.interest_rate ?? 0;
  if (!interestRate) return 0;

  const fundedDraws = projectDraws
    .filter((d) => d.status === "funded" && d.funded_date)
    .sort(
      (a, b) =>
        new Date(a.funded_date!).getTime() - new Date(b.funded_date!).getTime()
    );

  if (fundedDraws.length === 0) return 0;

  const endDate = project.end_date
    ? new Date(project.end_date)
    : new Date();

  let interest = 0;
  let runningBalance = 0;
  for (let i = 0; i < fundedDraws.length; i++) {
    const draw = fundedDraws[i];
    const drawDate = new Date(draw.funded_date!);
    runningBalance += draw.amount;
    const nextDate =
      i < fundedDraws.length - 1
        ? new Date(fundedDraws[i + 1].funded_date!)
        : endDate;
    const days = Math.max(
      0,
      (nextDate.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    interest += runningBalance * (interestRate / 100) * (days / 365);
  }
  return interest;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await searchParams;

  const supabase = await createClient();

  const [projectsRes, paymentsRes, drawsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("contractor_payments").select("*"),
    supabase.from("draw_requests").select("*"),
  ]);

  const projects: Project[] = projectsRes.data ?? [];
  const payments: ContractorPayment[] = paymentsRes.data ?? [];
  const draws: DrawRequest[] = drawsRes.data ?? [];

  // ── Maps ─────────────────────────────────────────────────────────
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // ── Active Projects (not archived) ──────────────────────────────
  const activeProjects = projects.filter((p) => p.status !== "archived");

  // ── Per-project financials ──────────────────────────────────────
  interface ProjectFinancials {
    project: Project;
    salePrice: number;
    totalCosts: number;
    loanAmount: number;
    drawsFunded: number;
    drawsPending: number;
    totalDraws: number;
    originationFeePercent: number;
    originationFee: number;
    interestRate: number;
    accruedInterest: number;
    projectedProfit: number;
    profitMargin: number;
  }

  const projectFinancials: ProjectFinancials[] = activeProjects.map((p) => {
    const projPayments = payments.filter((pm) => pm.project_id === p.id);
    const projDraws = draws.filter((d) => d.project_id === p.id);

    const salePrice = p.sale_price ?? 0;
    const loanAmount = p.loan_amount ?? 0;
    const originationFeePercent = p.origination_fee_percent ?? 0;
    const interestRate = p.interest_rate ?? 0;

    const totalCosts = projPayments.reduce((s, pm) => s + pm.amount, 0);

    const drawsFunded = projDraws
      .filter((d) => d.status === "funded")
      .reduce((s, d) => s + d.amount, 0);
    const drawsPending = projDraws
      .filter((d) => d.status === "submitted" || d.status === "approved")
      .reduce((s, d) => s + d.amount, 0);
    const totalDraws = projDraws.reduce((s, d) => s + d.amount, 0);

    const originationFee = (loanAmount * originationFeePercent) / 100;
    const accruedInterest = calcAccruedInterest(p, projDraws);
    const projectedProfit =
      salePrice - totalCosts - originationFee - accruedInterest;
    const profitMargin = salePrice > 0 ? projectedProfit / salePrice : 0;

    return {
      project: p,
      salePrice,
      totalCosts,
      loanAmount,
      drawsFunded,
      drawsPending,
      totalDraws,
      originationFeePercent,
      originationFee,
      interestRate,
      accruedInterest,
      projectedProfit,
      profitMargin,
    };
  });

  // Sort: projects with activity first, then by profit descending
  projectFinancials.sort((a, b) => {
    const aHasActivity = a.totalCosts + a.totalDraws > 0;
    const bHasActivity = b.totalCosts + b.totalDraws > 0;
    if (aHasActivity !== bHasActivity) return aHasActivity ? -1 : 1;
    return b.projectedProfit - a.projectedProfit;
  });

  // ── Summary totals ──────────────────────────────────────────────
  const totalBuildCosts = payments.reduce((s, pm) => s + pm.amount, 0);
  const totalDrawsFunded = draws
    .filter((d) => d.status === "funded")
    .reduce((s, d) => s + d.amount, 0);
  const totalPendingDraws = draws
    .filter((d) => d.status === "submitted" || d.status === "approved")
    .reduce((s, d) => s + d.amount, 0);
  const totalProjectedProfit = projectFinancials
    .filter((pf) => pf.salePrice > 0)
    .reduce((s, pf) => s + pf.projectedProfit, 0);

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
  // Sort draws within each project by draw_number
  for (const entry of drawsByProject.values()) {
    entry.draws.sort((a, b) => a.draw_number - b.draw_number);
  }

  // ── Pending Contractor Payments (needs draw request) ────────────
  const pendingPayments = payments.filter((p) => p.status === "pending");

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
              Construction loan tracking, draw requests, and projected profit
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
          {/* Total Build Costs */}
          <Card className="border-t-4 border-green-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Total Build Costs
                </span>
              </div>
              <p
                className="mt-3 text-3xl font-bold tabular-nums text-green-700"
                aria-label={spokenDollars(totalBuildCosts)}
              >
                {fmt(totalBuildCosts)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {payments.length} contractor payment
                {payments.length !== 1 && "s"}
              </p>
            </CardContent>
          </Card>

          {/* Draws Funded */}
          <Card className="border-t-4 border-blue-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Landmark className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Draws Funded
                </span>
              </div>
              <p
                className="mt-3 text-3xl font-bold tabular-nums text-blue-700"
                aria-label={spokenDollars(totalDrawsFunded)}
              >
                {fmt(totalDrawsFunded)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {draws.filter((d) => d.status === "funded").length} funded draw
                {draws.filter((d) => d.status === "funded").length !== 1 && "s"}
              </p>
            </CardContent>
          </Card>

          {/* Pending Draws */}
          <Card className="border-t-4 border-orange-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-50 p-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Pending Draws
                </span>
              </div>
              <p
                className="mt-3 text-3xl font-bold tabular-nums text-orange-700"
                aria-label={spokenDollars(totalPendingDraws)}
              >
                {fmt(totalPendingDraws)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Submitted or approved, awaiting lender
              </p>
            </CardContent>
          </Card>

          {/* Total Projected Profit */}
          <Card
            className={`border-t-4 shadow-sm ${
              totalProjectedProfit >= 0 ? "border-green-500" : "border-red-500"
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    totalProjectedProfit >= 0 ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {totalProjectedProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Projected Profit
                </span>
              </div>
              <p
                className={`mt-3 text-3xl font-bold tabular-nums ${
                  totalProjectedProfit >= 0 ? "text-green-700" : "text-red-700"
                }`}
                aria-label={spokenDollars(totalProjectedProfit)}
              >
                {fmt(totalProjectedProfit)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Sale price minus all costs
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="mb-8" />

        {/* ── B. Per-Project Financial Breakdown ────────────────── */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              Per-Project Financial Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectFinancials.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No active projects.
              </p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th scope="col" className="pb-3 pr-4 font-semibold text-gray-900">
                          Project
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Sale Price
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Total Costs
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Loan Amount
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Draws Funded
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Origination
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Interest
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Projected Profit
                        </th>
                        <th scope="col" className="pb-3 text-right font-semibold text-gray-900">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectFinancials.map((pf) => {
                        const profitable = pf.projectedProfit >= 0;
                        return (
                          <tr
                            key={pf.project.id}
                            className="border-b last:border-0"
                          >
                            <td className="py-3 pr-4">
                              <Link
                                href={`/admin/projects/${pf.project.id}`}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                              >
                                {pf.project.name}
                              </Link>
                            </td>
                            <td
                              className="py-3 pr-4 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.salePrice)}
                            >
                              {pf.salePrice > 0 ? fmt(pf.salePrice) : "--"}
                            </td>
                            <td
                              className="py-3 pr-4 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.totalCosts)}
                            >
                              {fmt(pf.totalCosts)}
                            </td>
                            <td
                              className="py-3 pr-4 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.loanAmount)}
                            >
                              {pf.loanAmount > 0 ? fmt(pf.loanAmount) : "--"}
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums text-gray-700">
                              {fmt(pf.drawsFunded)}
                              {pf.totalDraws > 0 && (
                                <span className="ml-1 text-xs text-gray-400">
                                  / {fmt(pf.totalDraws)}
                                </span>
                              )}
                            </td>
                            <td
                              className="py-3 pr-4 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.originationFee)}
                            >
                              {fmt(pf.originationFee)}
                              {pf.originationFeePercent > 0 && (
                                <span className="ml-1 text-xs text-gray-400">
                                  ({pf.originationFeePercent}%)
                                </span>
                              )}
                            </td>
                            <td
                              className="py-3 pr-4 text-right tabular-nums text-gray-700"
                              aria-label={spokenDollars(pf.accruedInterest)}
                            >
                              {fmt(pf.accruedInterest)}
                              {pf.interestRate > 0 && (
                                <span className="ml-1 text-xs text-gray-400">
                                  ({pf.interestRate}%)
                                </span>
                              )}
                            </td>
                            <td
                              className={`py-3 pr-4 text-right tabular-nums font-semibold ${
                                profitable ? "text-green-700" : "text-red-700"
                              }`}
                              aria-label={spokenDollars(pf.projectedProfit)}
                            >
                              {pf.salePrice > 0
                                ? fmt(pf.projectedProfit)
                                : "--"}
                            </td>
                            <td
                              className={`py-3 text-right tabular-nums font-semibold ${
                                profitable ? "text-green-700" : "text-red-700"
                              }`}
                            >
                              {pf.salePrice > 0 ? pct(pf.profitMargin) : "--"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card layout */}
                <div className="space-y-4 lg:hidden">
                  {projectFinancials.map((pf) => {
                    const profitable = pf.projectedProfit >= 0;
                    return (
                      <div
                        key={pf.project.id}
                        className={`rounded-lg border p-4 ${
                          profitable
                            ? "border-green-200 bg-green-50/30"
                            : "border-red-200 bg-red-50/30"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Link
                            href={`/admin/projects/${pf.project.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            {pf.project.name}
                          </Link>
                          {pf.salePrice > 0 && (
                            <Badge
                              variant="outline"
                              className={
                                profitable
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {pct(pf.profitMargin)} margin
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Sale Price</span>
                            <p className="tabular-nums font-medium text-gray-900">
                              {pf.salePrice > 0 ? fmt(pf.salePrice) : "--"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Costs</span>
                            <p className="tabular-nums font-medium text-gray-900">
                              {fmt(pf.totalCosts)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Loan Amount</span>
                            <p className="tabular-nums font-medium text-gray-900">
                              {pf.loanAmount > 0 ? fmt(pf.loanAmount) : "--"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Draws Funded</span>
                            <p className="tabular-nums font-medium text-gray-900">
                              {fmt(pf.drawsFunded)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Origination
                              {pf.originationFeePercent > 0 &&
                                ` (${pf.originationFeePercent}%)`}
                            </span>
                            <p className="tabular-nums font-medium text-gray-900">
                              {fmt(pf.originationFee)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Interest
                              {pf.interestRate > 0 &&
                                ` (${pf.interestRate}%)`}
                            </span>
                            <p className="tabular-nums font-medium text-gray-900">
                              {fmt(pf.accruedInterest)}
                            </p>
                          </div>
                        </div>
                        {pf.salePrice > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                Projected Profit
                              </span>
                              <span
                                className={`text-lg font-bold tabular-nums ${
                                  profitable
                                    ? "text-green-700"
                                    : "text-red-700"
                                }`}
                                aria-label={spokenDollars(pf.projectedProfit)}
                              >
                                {fmt(pf.projectedProfit)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── C. Draw Request Overview ──────────────────────────── */}
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Draw Request Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {drawsByProject.size === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No draw requests yet.
              </p>
            ) : (
              <div className="space-y-6">
                {Array.from(drawsByProject.values()).map(
                  ({ project: proj, draws: projDraws }) => {
                    const projTotal = projDraws.reduce(
                      (s, d) => s + d.amount,
                      0
                    );
                    const projFunded = projDraws
                      .filter((d) => d.status === "funded")
                      .reduce((s, d) => s + d.amount, 0);

                    return (
                      <div key={proj.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            {proj.name}
                          </Link>
                          <span className="text-sm tabular-nums text-gray-500">
                            {fmt(projFunded)} funded / {fmt(projTotal)} total
                          </span>
                        </div>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left">
                                <th scope="col" className="pb-2 pr-4 font-semibold text-gray-700">
                                  Draw #
                                </th>
                                <th scope="col" className="pb-2 pr-4 text-right font-semibold text-gray-700">
                                  Amount
                                </th>
                                <th scope="col" className="pb-2 pr-4 font-semibold text-gray-700">
                                  Status
                                </th>
                                <th scope="col" className="pb-2 pr-4 font-semibold text-gray-700">
                                  Submitted
                                </th>
                                <th scope="col" className="pb-2 font-semibold text-gray-700">
                                  Funded
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {projDraws.map((d) => (
                                <tr
                                  key={d.id}
                                  className="border-b last:border-0"
                                >
                                  <td className="py-2 pr-4 tabular-nums text-gray-900">
                                    #{d.draw_number}
                                  </td>
                                  <td
                                    className="py-2 pr-4 text-right tabular-nums font-medium text-gray-900"
                                    aria-label={spokenDollars(d.amount)}
                                  >
                                    {fmt(d.amount)}
                                  </td>
                                  <td className="py-2 pr-4">
                                    <Badge
                                      variant="outline"
                                      className={
                                        DRAW_STATUS_COLORS[
                                          d.status as DrawRequestStatus
                                        ] ?? ""
                                      }
                                    >
                                      {d.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-4 tabular-nums text-gray-600">
                                    {formatDate(d.submitted_date)}
                                  </td>
                                  <td className="py-2 tabular-nums text-gray-600">
                                    {formatDate(d.funded_date)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile card layout */}
                        <div className="space-y-2 md:hidden">
                          {projDraws.map((d) => (
                            <div
                              key={d.id}
                              className="rounded-lg border bg-white p-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="tabular-nums font-medium text-gray-900">
                                  Draw #{d.draw_number}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    DRAW_STATUS_COLORS[
                                      d.status as DrawRequestStatus
                                    ] ?? ""
                                  }
                                >
                                  {d.status}
                                </Badge>
                              </div>
                              <p
                                className="mt-1 text-lg font-bold tabular-nums text-gray-900"
                                aria-label={spokenDollars(d.amount)}
                              >
                                {fmt(d.amount)}
                              </p>
                              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                                <span>
                                  Submitted: {formatDate(d.submitted_date)}
                                </span>
                                <span>
                                  Funded: {formatDate(d.funded_date)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator className="mt-4" />
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── D. Needs Draw Request ────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5 text-orange-500" />
              Needs Draw Request
            </CardTitle>
            <p className="text-sm text-gray-500">
              Pending contractor payments to include in the next draw request to
              the lender
            </p>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No pending contractor payments.
              </p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th scope="col" className="pb-3 pr-4 font-semibold text-gray-900">
                          Contractor
                        </th>
                        <th scope="col" className="pb-3 pr-4 font-semibold text-gray-900">
                          Project
                        </th>
                        <th scope="col" className="pb-3 pr-4 font-semibold text-gray-900">
                          Description
                        </th>
                        <th scope="col" className="pb-3 pr-4 text-right font-semibold text-gray-900">
                          Amount
                        </th>
                        <th scope="col" className="pb-3 font-semibold text-gray-900">
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((pm) => {
                        const proj = projectMap.get(pm.project_id);
                        return (
                          <tr
                            key={pm.id}
                            className="border-b last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium text-gray-900">
                              {pm.contractor_name}
                            </td>
                            <td className="py-3 pr-4">
                              {proj ? (
                                <Link
                                  href={`/admin/projects/${proj.id}`}
                                  className="text-indigo-600 hover:text-indigo-500"
                                >
                                  {proj.name}
                                </Link>
                              ) : (
                                <span className="text-gray-500">Unknown</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {pm.description ?? "--"}
                            </td>
                            <td
                              className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-900"
                              aria-label={spokenDollars(pm.amount)}
                            >
                              {fmt(pm.amount)}
                            </td>
                            <td className="py-3">
                              {pm.invoice_file_url ? (
                                <a
                                  href={pm.invoice_file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                  <FileText className="h-3 w-3" />
                                  {pm.invoice_file_name ?? "View"}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  None
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td
                          colSpan={3}
                          className="py-3 pr-4 text-right font-semibold text-gray-900"
                        >
                          Total
                        </td>
                        <td
                          className="py-3 pr-4 text-right tabular-nums font-bold text-gray-900"
                          aria-label={spokenDollars(
                            pendingPayments.reduce((s, p) => s + p.amount, 0)
                          )}
                        >
                          {fmt(
                            pendingPayments.reduce((s, p) => s + p.amount, 0)
                          )}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile card layout */}
                <div className="space-y-3 md:hidden">
                  {pendingPayments.map((pm) => {
                    const proj = projectMap.get(pm.project_id);
                    return (
                      <div
                        key={pm.id}
                        className="rounded-lg border bg-white p-4"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {pm.contractor_name}
                          </span>
                          <span
                            className="text-lg font-bold tabular-nums text-gray-900"
                            aria-label={spokenDollars(pm.amount)}
                          >
                            {fmt(pm.amount)}
                          </span>
                        </div>
                        {proj && (
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            {proj.name}
                          </Link>
                        )}
                        {pm.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {pm.description}
                          </p>
                        )}
                        {pm.invoice_file_url && (
                          <a
                            href={pm.invoice_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                          >
                            <FileText className="h-3 w-3" />
                            {pm.invoice_file_name ?? "View Invoice"}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                  <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-right">
                    <span className="text-sm font-medium text-gray-700">
                      Total:{" "}
                    </span>
                    <span
                      className="text-lg font-bold tabular-nums text-gray-900"
                      aria-label={spokenDollars(
                        pendingPayments.reduce((s, p) => s + p.amount, 0)
                      )}
                    >
                      {fmt(pendingPayments.reduce((s, p) => s + p.amount, 0))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
