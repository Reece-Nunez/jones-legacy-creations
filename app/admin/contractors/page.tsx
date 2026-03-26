import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Contractor, type ContractorPayment, TRADES } from "@/lib/types/database";
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Wrench,
  Building2,
  DollarSign,
  FolderOpen,
  AlertCircle,
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const TRADE_COLORS: Record<string, string> = {
  General: "bg-gray-100 text-gray-700",
  Plumbing: "bg-blue-100 text-blue-700",
  Electrical: "bg-yellow-100 text-yellow-800",
  HVAC: "bg-cyan-100 text-cyan-700",
  Framing: "bg-amber-100 text-amber-800",
  Roofing: "bg-red-100 text-red-700",
  Concrete: "bg-stone-200 text-stone-700",
  Drywall: "bg-slate-100 text-slate-700",
  Painting: "bg-purple-100 text-purple-700",
  Flooring: "bg-orange-100 text-orange-700",
  Landscaping: "bg-green-100 text-green-700",
  Excavation: "bg-amber-200 text-amber-900",
  "Steel/Welding": "bg-zinc-200 text-zinc-700",
  Cabinetry: "bg-rose-100 text-rose-700",
  Tile: "bg-teal-100 text-teal-700",
  Insulation: "bg-pink-100 text-pink-700",
  "Windows/Doors": "bg-indigo-100 text-indigo-700",
  Siding: "bg-lime-100 text-lime-700",
  Fencing: "bg-emerald-100 text-emerald-700",
  Other: "bg-gray-100 text-gray-600",
};

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trade?: string }>;
}) {
  const { q, trade } = await searchParams;
  const supabase = await createClient();

  // Fetch contractors and payments in parallel
  let contractorsQuery = supabase
    .from("contractors")
    .select("*")
    .order("name", { ascending: true });

  if (q) {
    contractorsQuery = contractorsQuery.or(
      `name.ilike.%${q}%,company.ilike.%${q}%`
    );
  }

  if (trade) {
    contractorsQuery = contractorsQuery.eq("trade", trade);
  }

  const [{ data: contractors }, { data: payments }] = await Promise.all([
    contractorsQuery,
    supabase.from("contractor_payments").select("*"),
  ]);

  const contractorList: Contractor[] = contractors ?? [];
  const paymentList: ContractorPayment[] = payments ?? [];

  // Build payment summaries per contractor
  const paymentSummary: Record<
    string,
    { totalPaid: number; projectIds: Set<string> }
  > = {};

  for (const p of paymentList) {
    if (!p.contractor_id) continue;
    if (!paymentSummary[p.contractor_id]) {
      paymentSummary[p.contractor_id] = { totalPaid: 0, projectIds: new Set() };
    }
    if (p.status === "paid") {
      paymentSummary[p.contractor_id].totalPaid += p.amount || 0;
    }
    paymentSummary[p.contractor_id].projectIds.add(p.project_id);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Contractor Directory
          </h1>
          <Link
            href="/admin/contractors/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
            style={{ minHeight: 44 }}
          >
            <Plus className="h-5 w-5" />
            Add Contractor
          </Link>
        </div>

        {/* Search Bar */}
        <form method="GET" className="mb-6">
          {trade && <input type="hidden" name="trade" value={trade} />}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name or company..."
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ minHeight: 44 }}
            />
          </div>
        </form>

        {/* Trade Filter Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={`/admin/contractors${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !trade
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
            }`}
            style={{ minHeight: 36 }}
          >
            All
          </Link>
          {TRADES.map((t) => (
            <Link
              key={t}
              href={`/admin/contractors?trade=${encodeURIComponent(t)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                trade === t
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
              }`}
              style={{ minHeight: 36 }}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* Contractor Cards */}
        {contractorList.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">
              No contractors found
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {q || trade
                ? "Try adjusting your search or filters."
                : "Add your first contractor to get started."}
            </p>
            {!q && !trade && (
              <Link
                href="/admin/contractors/new"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                style={{ minHeight: 44 }}
              >
                <Plus className="h-5 w-5" />
                Add Contractor
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contractorList.map((contractor) => {
              const summary = paymentSummary[contractor.id];
              const totalPaid = summary?.totalPaid ?? 0;
              const projectCount = summary?.projectIds.size ?? 0;

              return (
                <Link
                  key={contractor.id}
                  href={`/admin/contractors/${contractor.id}`}
                  className="group rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Name & Trade */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                          {contractor.name}
                        </h3>
                        {contractor.company && (
                          <p className="flex items-center gap-1 text-sm text-gray-500">
                            <Building2 className="h-3.5 w-3.5" />
                            {contractor.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        TRADE_COLORS[contractor.trade] ?? TRADE_COLORS.Other
                      }`}
                    >
                      {contractor.trade}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="mb-3 space-y-1.5">
                    {contractor.phone && (
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className="inline"
                        >
                          <a
                            href={`tel:${contractor.phone}`}
                            className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
                            style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
                          >
                            {contractor.phone}
                          </a>
                        </span>
                      </p>
                    )}
                    {contractor.email && (
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span
                          onClick={(e) => e.stopPropagation()}
                          className="inline"
                        >
                          <a
                            href={`mailto:${contractor.email}`}
                            className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
                            style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
                          >
                            {contractor.email}
                          </a>
                        </span>
                      </p>
                    )}
                    {contractor.license_number && (
                      <p className="flex items-center gap-2 text-sm text-gray-500">
                        <Wrench className="h-4 w-4 text-gray-400" />
                        Lic# {contractor.license_number}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 border-t border-gray-100 pt-3">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      {formatCurrency(totalPaid)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                      {projectCount} project{projectCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Notes Preview */}
                  {contractor.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">
                      {contractor.notes}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
