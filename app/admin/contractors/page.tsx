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
  Store,
  Tag,
  FileText,
  ListPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClickStop } from "@/components/ui/click-stop";

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
  Engineering: "bg-violet-100 text-violet-700",
  "Steel/Welding": "bg-zinc-200 text-zinc-700",
  Cabinetry: "bg-rose-100 text-rose-700",
  Tile: "bg-teal-100 text-teal-700",
  Insulation: "bg-pink-100 text-pink-700",
  "Windows/Doors": "bg-indigo-100 text-indigo-700",
  "Exterior Finishes": "bg-lime-100 text-lime-700",
  Fencing: "bg-emerald-100 text-emerald-700",
  Other: "bg-gray-100 text-gray-600",
};

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trade?: string; type?: string }>;
}) {
  const { q, trade, type } = await searchParams;
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
    contractorsQuery = contractorsQuery.ilike("trade", `%${trade}%`);
  }

  if (type) {
    contractorsQuery = contractorsQuery.eq("type", type);
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

  // Build query string helper
  function buildUrl(params: Record<string, string | undefined>) {
    const filtered = Object.entries(params).filter(([, v]) => v);
    if (filtered.length === 0) return "/admin/contractors";
    return `/admin/contractors?${filtered.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")}`;
  }

  const showingVendors = type === "vendor";
  const showingContractors = type === "contractor";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Contractors & Vendors
          </h1>
          <div className="flex gap-2">
            <Link
              href="/admin/contractors/bulk"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              style={{ minHeight: 44 }}
            >
              <ListPlus className="h-5 w-5" />
              Bulk Add
            </Link>
            <Link
              href="/admin/contractors/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
              style={{ minHeight: 44 }}
            >
              <Plus className="h-5 w-5" />
              Add New
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <form method="GET" className="mb-6">
          {trade && <input type="hidden" name="trade" value={trade} />}
          {type && <input type="hidden" name="type" value={type} />}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name or company..."
              aria-label="Search contractors and vendors by name or company"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ minHeight: 44 }}
            />
          </div>
        </form>

        {/* Filters Row */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Type Filter */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
            <Link
              href={buildUrl({ q, trade })}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                !type ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }}
            >
              All
            </Link>
            <Link
              href={buildUrl({ q, trade, type: "contractor" })}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-l border-gray-300 transition-colors ${
                showingContractors ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }}
            >
              <User className="h-3.5 w-3.5" />
              Contractors
            </Link>
            <Link
              href={buildUrl({ q, type: "vendor" })}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-l border-gray-300 transition-colors ${
                showingVendors ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }}
            >
              <Store className="h-3.5 w-3.5" />
              Vendors
            </Link>
          </div>

          {/* Trade Dropdown — only for non-vendor views */}
          {!showingVendors && (
            <form method="GET" className="flex items-center gap-2 flex-1 sm:max-w-sm">
              {q && <input type="hidden" name="q" value={q} />}
              {type && <input type="hidden" name="type" value={type} />}
              <select
                name="trade"
                defaultValue={trade ?? ""}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat pr-10"
                style={{ minHeight: 44 }}
                aria-label="Filter by trade"
              >
                <option value="">All Trades</option>
                {TRADES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
                style={{ minHeight: 44 }}
              >
                Filter
              </button>
            </form>
          )}
        </div>

        {/* Cards */}
        {contractorList.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-500">
                {showingVendors ? "No vendors found" : showingContractors ? "No contractors found" : "No contractors or vendors found"}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {q || trade || type
                  ? "Try adjusting your search or filters."
                  : "Add your first contractor or vendor to get started."}
              </p>
              {!q && !trade && !type && (
                <Link
                  href="/admin/contractors/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                  style={{ minHeight: 44 }}
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Entry
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contractorList.map((contractor) => {
              const summary = paymentSummary[contractor.id];
              const totalPaid = summary?.totalPaid ?? 0;
              const projectCount = summary?.projectIds.size ?? 0;
              const isVendor = contractor.type === "vendor";

              return (
                <Link
                  key={contractor.id}
                  href={`/admin/contractors/${contractor.id}`}
                  aria-label={`View details for ${contractor.name}${contractor.company ? `, ${contractor.company}` : ""}`}
                  className="group block"
                >
                <Card className="cursor-pointer shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  {/* Name & Badge */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isVendor ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                      }`}>
                        {isVendor ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                          {isVendor ? (contractor.company || contractor.name) : contractor.name}
                        </h3>
                        {isVendor ? (
                          contractor.company && contractor.name !== contractor.company && (
                            <p className="text-sm text-gray-500">{contractor.name}</p>
                          )
                        ) : (
                          contractor.company && (
                            <p className="flex items-center gap-1 text-sm text-gray-500">
                              <Building2 className="h-3.5 w-3.5" />
                              {contractor.company}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                    {isVendor ? (
                      contractor.vendor_category && (
                        <Badge
                          variant="outline"
                          className="shrink-0 bg-emerald-50 text-emerald-700"
                        >
                          {contractor.vendor_category}
                        </Badge>
                      )
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(contractor.trade ?? "").split(", ").filter(Boolean).map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className={`shrink-0 ${
                              TRADE_COLORS[t] ?? TRADE_COLORS.Other
                            }`}
                          >
                            {t}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                          1099
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="mb-3 space-y-1.5 flex-1">
                    {contractor.phone && (
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <ClickStop className="inline">
                          <a
                            href={`tel:${contractor.phone}`}
                            aria-label={`Call ${contractor.name} at ${contractor.phone}`}
                            className="rounded px-1 py-1 text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
                            style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
                          >
                            {contractor.phone}
                          </a>
                        </ClickStop>
                      </p>
                    )}
                    {contractor.email && (
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <ClickStop className="inline">
                          <a
                            href={`mailto:${contractor.email}`}
                            aria-label={`Email ${contractor.name} at ${contractor.email}`}
                            className="rounded px-1 py-1 text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
                            style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
                          >
                            {contractor.email}
                          </a>
                        </ClickStop>
                      </p>
                    )}
                    {!isVendor && contractor.license_number && (
                      <p className="flex items-center gap-2 text-sm text-gray-500">
                        <Wrench className="h-4 w-4 text-gray-400" />
                        Lic# {contractor.license_number}
                      </p>
                    )}
                    {isVendor && contractor.account_number && (
                      <p className="flex items-center gap-2 text-sm text-gray-500">
                        <Tag className="h-4 w-4 text-gray-400" />
                        Acct# {contractor.account_number}
                      </p>
                    )}
                    {!isVendor && contractor.w9_file_url && (
                      <p className="flex items-center gap-2 text-sm text-green-600">
                        <FileText className="h-4 w-4 text-green-500" />
                        W9 on file
                      </p>
                    )}
                    {!isVendor && !contractor.w9_file_url && contractor.w9_required !== false && (
                      <p className="flex items-center gap-2 text-sm text-amber-600">
                        <FileText className="h-4 w-4 text-amber-500" />
                        W9 missing
                      </p>
                    )}
                    {!isVendor && contractor.w9_required === false && (
                      <p className="flex items-center gap-2 text-sm text-gray-400">
                        <FileText className="h-4 w-4 text-gray-300" />
                        W9 not required
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 border-t border-gray-100 pt-3 mt-auto">
                    <span className="flex items-center gap-1 text-sm tabular-nums text-green-600">
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
                </CardContent>
                </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
