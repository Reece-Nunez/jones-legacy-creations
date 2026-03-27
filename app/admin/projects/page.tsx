import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type ProjectStatus,
  type ProjectType,
  type Project,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_TYPE_LABELS,
} from "@/lib/types/database";
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Helpers ─────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Status-based left-border colors for project cards
const STATUS_LEFT_BORDER: Record<ProjectStatus, string> = {
  lead: "border-l-gray-400",
  estimate_sent: "border-l-blue-400",
  approved: "border-l-green-400",
  waiting_on_permit: "border-l-yellow-400",
  in_progress: "border-l-indigo-500",
  waiting_on_payment: "border-l-orange-400",
  completed: "border-l-emerald-500",
  archived: "border-l-slate-300",
};

const PROJECT_TYPE_COLORS: Record<ProjectType, string> = {
  residential: "bg-sky-100 text-sky-700",
  commercial: "bg-purple-100 text-purple-700",
  renovation: "bg-amber-100 text-amber-700",
  interior_design: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

// ── Main Component ──────────────────────────────────────────

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const { status: statusFilter, type: typeFilter, q: searchQuery } = await searchParams;
  const supabase = await createClient();

  // Fetch all projects ordered by most recently updated
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  const projects: Project[] = data ?? [];

  // ── Filter ──────────────────────────────────────────────────
  let filteredProjects = [...projects];

  if (statusFilter) {
    filteredProjects = filteredProjects.filter((p) => p.status === statusFilter);
  }

  if (typeFilter) {
    filteredProjects = filteredProjects.filter((p) => p.project_type === typeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProjects = filteredProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q)
    );
  }

  // ── Status counts ───────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }

  const allStatuses = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];
  const allTypes = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];

  function filterUrl(params: { status?: string; type?: string; q?: string }) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    if (params.type) sp.set("type", params.type);
    if (params.q) sp.set("q", params.q);
    const qs = sp.toString();
    return `/admin/projects${qs ? `?${qs}` : ""}`;
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              All Projects
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {projects.length} project{projects.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link
            href="/admin/projects/new"
            className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Project
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <form action="/admin/projects" method="GET">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                name="q"
                placeholder="Search by name or client..."
                defaultValue={searchQuery ?? ""}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </form>
        </div>

        {/* Status filter pills */}
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          <Link
            href={filterUrl({ type: typeFilter, q: searchQuery })}
            className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              !statusFilter
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
            }`}
          >
            All ({projects.length})
          </Link>
          {allStatuses.map((s) =>
            (statusCounts[s] || 0) > 0 ? (
              <Link
                key={s}
                href={filterUrl({ status: s, type: typeFilter, q: searchQuery })}
                className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  statusFilter === s
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
                }`}
              >
                {PROJECT_STATUS_LABELS[s]} ({statusCounts[s]})
              </Link>
            ) : null
          )}
        </div>

        {/* Project type filter pills */}
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by type">
          <Link
            href={filterUrl({ status: statusFilter, q: searchQuery })}
            className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              !typeFilter
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
            }`}
          >
            All Types
          </Link>
          {allTypes.map((t) => (
            <Link
              key={t}
              href={filterUrl({ status: statusFilter, type: t, q: searchQuery })}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                typeFilter === t
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
              }`}
            >
              {PROJECT_TYPE_LABELS[t]}
            </Link>
          ))}
        </div>

        {/* Project Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-gray-400" aria-hidden="true" />
              <p className="mt-4 text-lg font-medium text-gray-700">
                No projects found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter || typeFilter || searchQuery
                  ? "Try adjusting your filters or search."
                  : "Create your first project to get started."}
              </p>
              {(statusFilter || typeFilter || searchQuery) ? (
                <Link
                  href="/admin/projects"
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-800"
                >
                  Clear Filters
                </Link>
              ) : (
                <Link
                  href="/admin/projects/new"
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New Project
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="block"
                aria-label={`${project.name} - ${PROJECT_STATUS_LABELS[project.status]} - ${project.client_name}`}
              >
                <Card
                  className={`group cursor-pointer shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-l-4 ${STATUS_LEFT_BORDER[project.status]}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-gray-900 transition-colors duration-200 group-hover:text-indigo-600">
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`shrink-0 px-2.5 py-0.5 text-sm font-semibold ${PROJECT_STATUS_COLORS[project.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{project.client_name}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Type badge */}
                    <Badge
                      variant="outline"
                      className={`mb-2 px-2 py-0.5 text-xs font-medium ${PROJECT_TYPE_COLORS[project.project_type]}`}
                    >
                      {PROJECT_TYPE_LABELS[project.project_type]}
                    </Badge>

                    {/* Location */}
                    {(project.city || project.state) && (
                      <p className="flex items-center gap-1.5 text-sm text-gray-500">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {[project.city, project.state].filter(Boolean).join(", ")}
                      </p>
                    )}

                    {/* Value */}
                    {(project.contract_value != null || project.estimated_value != null) && (
                      <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">
                        {fmt(project.contract_value ?? project.estimated_value!)}
                        {project.contract_value != null && (
                          <span className="ml-1 text-xs font-normal text-gray-500">contract</span>
                        )}
                        {project.contract_value == null && project.estimated_value != null && (
                          <span className="ml-1 text-xs font-normal text-gray-500">est.</span>
                        )}
                      </p>
                    )}

                    {/* Created date */}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      Created {fmtDate(project.created_at)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
