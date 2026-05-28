/**
 * Portfolio Cash Flow page — every money event across every project
 * in one chronological feed.
 *
 * Sister page to /admin/financials (the per-project breakdown). Kept as
 * its own route rather than a tab so it can stay a fully server-rendered
 * Suspense boundary — large CSV exports are common here.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  ContractorPayment,
  LoanLedgerEntry,
  Project,
  ProjectMiscCharge,
  ProjectSettlement,
} from "@/lib/types/database";
import PortfolioCashFlow from "@/components/admin/PortfolioCashFlow";

export default async function PortfolioCashFlowPage() {
  const supabase = await createClient();

  const [projectsRes, paymentsRes, loanLedgerRes, settlementsRes, miscRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("contractor_payments").select("*"),
      supabase.from("loan_ledger").select("*"),
      supabase.from("project_settlements").select("*"),
      supabase.from("project_misc_charges").select("*"),
    ]);

  const projects: Project[] = projectsRes.data ?? [];
  const payments: ContractorPayment[] = paymentsRes.data ?? [];
  const loanLedger: LoanLedgerEntry[] = loanLedgerRes.data ?? [];
  const settlements: ProjectSettlement[] = settlementsRes.data ?? [];
  const miscCharges: ProjectMiscCharge[] = miscRes.data ?? [];

  // Skip archived projects from the cross-project rollup — Blake
  // shouldn't see cash flow for projects he closed out long ago. He
  // can still drill into an archived project to see its own feed.
  const activeProjects = projects.filter((p) => p.status !== "archived");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Cash Flow</h1>
            <p className="mt-1 text-sm text-gray-500">
              Every money event across every project. Filter, search, export.
            </p>
          </div>
          <Link
            href="/admin/financials"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Financials
          </Link>
        </div>

        <PortfolioCashFlow
          projects={activeProjects}
          payments={payments}
          loanLedger={loanLedger}
          settlements={settlements}
          miscCharges={miscCharges}
        />
      </div>
    </div>
  );
}
