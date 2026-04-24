import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type ProjectStatus,
  type Project,
  type Contractor,
  type DrawRequest,
  type Permit,
  type Task,
  type Estimate,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/types/database";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  Inbox,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  computeProjectFinancials,
  sumProjectedProfit,
} from "@/lib/finance/project-financials";

// ── Helpers ─────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const fmtFull = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getGreeting(): string {
  return "Welcome back";
}

function endOfWeek(now: Date): Date {
  const end = new Date(now);
  const day = end.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ── Types for action items ──────────────────────────────────

type ActionPriority = "red" | "orange" | "yellow" | "blue";
type ActionCategory = "overdue" | "task" | "permit" | "draw" | "w9" | "estimate" | "project_details";

interface ActionItem {
  id: string;
  priority: ActionPriority;
  category: ActionCategory;
  label: string;
  sublabel: string;
  detail: string;
  href: string;
  quickAction?: { label: string; href: string };
}

const PRIORITY_BORDER: Record<ActionPriority, string> = {
  red: "border-l-red-500",
  orange: "border-l-orange-500",
  yellow: "border-l-yellow-400",
  blue: "border-l-blue-400",
};

const PRIORITY_ICON: Record<ActionPriority, typeof AlertTriangle> = {
  red: AlertTriangle,
  orange: AlertTriangle,
  yellow: Clock,
  blue: Clock,
};

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  overdue: "Overdue",
  estimate: "New Estimates",
  w9: "Missing W9s",
  task: "Tasks",
  permit: "Permits",
  draw: "Draw Requests",
  project_details: "Missing Project Details",
};

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

// ── Main Component ──────────────────────────────────────────

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekEnd = endOfWeek(now);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  // ── Fetch all data in parallel ────────────────────────────
  const [
    projectsRes,
    permitsRes,
    tasksRes,
    drawsRes,
    paymentsRes,
    estimatesRes,
    contractorsRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("permits").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("draw_requests").select("*"),
    supabase.from("contractor_payments").select("project_id, amount"),
    supabase
      .from("estimates")
      .select("*")
      .in("status", ["new", "reviewed"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contractors")
      .select("id, name, company, type, w9_file_url, w9_required")
      .eq("type", "contractor")
      .eq("w9_required", true)
      .is("w9_file_url", null),
  ]);

  const projects: Project[] = projectsRes.data ?? [];
  const permits: Permit[] = permitsRes.data ?? [];
  const tasks: Task[] = tasksRes.data ?? [];
  const draws: DrawRequest[] = drawsRes.data ?? [];
  const payments: { project_id: string; amount: number }[] = paymentsRes.data ?? [];
  const estimates: Estimate[] = estimatesRes.data ?? [];
  const contractorsMissingW9: Pick<Contractor, "id" | "name" | "company">[] = contractorsRes.data ?? [];

  // ── Project lookup map ────────────────────────────────────
  const projectMap = new Map<string, Project>();
  for (const p of projects) projectMap.set(p.id, p);
  const projectName = (id: string) => projectMap.get(id)?.name ?? "Unknown";

  // ── Quick stats ───────────────────────────────────────────
  const activeProjects = projects.filter(
    (p) => p.status !== "archived" && p.status !== "completed"
  );

  // Tasks due this week
  const tasksDueThisWeek = tasks.filter(
    (t) => !t.completed && t.due_date && t.due_date <= weekEndStr && t.due_date >= today
  );

  // Overdue items (tasks only)
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.due_date && t.due_date < today
  );
  const overdueCount = overdueTasks.length;

  // Total projected profit across all active projects — delegates to the
  // shared helper so the dashboard can't drift from the Financials page.
  // See lib/finance/project-financials.ts for the formula and invariants.
  const activeFinancials = activeProjects.map((p) =>
    computeProjectFinancials(p, payments, draws, now),
  );
  const totalProjectedProfit = sumProjectedProfit(activeFinancials);
  const projectsWithProfit = activeFinancials.filter((f) => f.salePrice > 0).length;

  // Draws: funded vs pending
  const fundedDraws = draws.filter((d) => d.status === "funded");
  const fundedDrawTotal = fundedDraws.reduce((s, d) => s + (d.amount || 0), 0);

  const pendingDraws = draws.filter((d) => d.status === "submitted" || d.status === "approved");
  const pendingDrawTotal = pendingDraws.reduce((s, d) => s + (d.amount || 0), 0);

  // ── Build Action Items ────────────────────────────────────
  const actionItems: ActionItem[] = [];

  // New estimates needing review
  const newEstimates = estimates.filter((e) => e.status === "new");
  for (const est of newEstimates) {
    const daysAgo = daysBetween(est.created_at, now);
    actionItems.push({
      id: `estimate-${est.id}`,
      priority: daysAgo > 2 ? "orange" : "yellow",
      category: "estimate",
      label: `New estimate: ${est.client_name}`,
      sublabel: est.project_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      detail: daysAgo === 0 ? "Submitted today" : `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`,
      href: "/admin/estimates",
    });
  }

  // Tasks due this week
  for (const task of tasksDueThisWeek) {
    const days = daysUntil(task.due_date!, now);
    actionItems.push({
      id: `task-${task.id}`,
      priority: days <= 1 ? "orange" : "yellow",
      category: "task",
      label: task.title,
      sublabel: projectName(task.project_id),
      detail: days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`,
      href: `/admin/projects/${task.project_id}`,
    });
  }

  // Overdue tasks
  for (const task of overdueTasks) {
    const daysOver = daysBetween(task.due_date!, now);
    actionItems.push({
      id: `task-over-${task.id}`,
      priority: "red",
      category: "overdue",
      label: task.title,
      sublabel: projectName(task.project_id),
      detail: `${daysOver} day${daysOver !== 1 ? "s" : ""} overdue`,
      href: `/admin/projects/${task.project_id}`,
    });
  }

  // Contractors missing W9
  for (const c of contractorsMissingW9) {
    actionItems.push({
      id: `w9-${c.id}`,
      priority: "orange",
      category: "w9",
      label: `W9 missing: ${c.name}`,
      sublabel: c.company || "No company",
      detail: "Lender requires W9 before payout",
      href: `/admin/contractors/${c.id}`,
    });
  }

  // Projects missing property details (for accurate estimates)
  const activeStatuses = ["lead", "estimate_sent", "approved", "waiting_on_permit", "in_progress", "waiting_on_payment"];
  const projectsMissingDetails = projects.filter(
    (p) => activeStatuses.includes(p.status) && p.square_footage == null
  );
  for (const p of projectsMissingDetails) {
    actionItems.push({
      id: `details-${p.id}`,
      priority: "yellow",
      category: "project_details",
      label: `${p.name} needs property details`,
      sublabel: p.client_name,
      detail: "Missing details for accurate estimates",
      href: `/admin/projects/${p.id}`,
    });
  }

  // Permits pending (applied)
  const pendingPermits = permits.filter((p) => p.status === "applied");
  for (const permit of pendingPermits) {
    const daysWaiting = permit.applied_date
      ? daysBetween(permit.applied_date, now)
      : 0;
    actionItems.push({
      id: `permit-${permit.id}`,
      priority: daysWaiting > 30 ? "orange" : "yellow",
      category: "permit",
      label: `Permit: ${permit.permit_type}`,
      sublabel: projectName(permit.project_id),
      detail: `Waiting ${daysWaiting} day${daysWaiting !== 1 ? "s" : ""}`,
      href: `/admin/projects/${permit.project_id}`,
    });
  }

  // Draw requests needing action
  const draftDraws = draws.filter((d) => d.status === "draft");
  for (const draw of draftDraws) {
    actionItems.push({
      id: `draw-${draw.id}`,
      priority: "yellow",
      category: "draw",
      label: `Draw #${draw.draw_number} — submit to lender`,
      sublabel: projectName(draw.project_id),
      detail: fmtFull(draw.amount),
      href: `/admin/projects/${draw.project_id}`,
    });
  }

  const submittedDraws = draws.filter((d) => d.status === "submitted" || d.status === "approved");
  for (const draw of submittedDraws) {
    actionItems.push({
      id: `draw-${draw.id}`,
      priority: "blue",
      category: "draw",
      label: `Draw #${draw.draw_number} — waiting on lender`,
      sublabel: projectName(draw.project_id),
      detail: fmtFull(draw.amount),
      href: `/admin/projects/${draw.project_id}`,
    });
  }

  // Sort: red first, then orange, yellow, blue
  const priorityOrder: Record<ActionPriority, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    blue: 3,
  };
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Group action items by category for section headers
  const groupedActions: { category: ActionCategory; items: ActionItem[] }[] = [];
  const seenCategories = new Set<ActionCategory>();
  for (const item of actionItems) {
    if (!seenCategories.has(item.category)) {
      seenCategories.add(item.category);
      groupedActions.push({
        category: item.category,
        items: actionItems.filter((a) => a.category === item.category),
      });
    }
  }

  // ── Projects grid data ───────────────────────────────────
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }

  const tasksByProject: Record<string, { total: number; completed: number }> = {};
  for (const t of tasks) {
    if (!tasksByProject[t.project_id]) {
      tasksByProject[t.project_id] = { total: 0, completed: 0 };
    }
    tasksByProject[t.project_id].total++;
    if (t.completed) tasksByProject[t.project_id].completed++;
  }

  // Filter projects
  let filteredProjects = [...projects];
  if (statusFilter) {
    filteredProjects = filteredProjects.filter((p) => p.status === statusFilter);
  }

  // Sort: active first, then by updated_at desc
  filteredProjects.sort((a, b) => {
    const aActive = a.status !== "archived" && a.status !== "completed";
    const bActive = b.status !== "archived" && b.status !== "completed";
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const allStatuses = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

  function filterUrl(params: { status?: string }) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    const qs = sp.toString();
    return `/admin${qs ? `?${qs}` : ""}`;
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ────────────────────────────────────────────────── */}
        {/* 1. GREETING + QUICK STATS                         */}
        {/* ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {getGreeting()}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Here&apos;s what&apos;s happening across your projects.
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-white to-indigo-50/40 shadow-sm">
            <CardContent className="pt-6 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <FolderKanban className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Active Projects
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
                {activeProjects.length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-amber-50/40 shadow-sm">
            <CardContent className="pt-6 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                  <CalendarClock className="h-5 w-5 text-amber-600" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Due This Week
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
                {tasksDueThisWeek.length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-red-50/40 shadow-sm">
            <CardContent className="pt-6 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Overdue Items
                </span>
              </div>
              <p
                className={`mt-3 text-2xl font-bold tabular-nums sm:text-3xl ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}
                role={overdueCount > 0 ? "alert" : undefined}
              >
                {overdueCount}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-emerald-50/40 shadow-sm">
            <CardContent className="pt-6 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${totalProjectedProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                  {totalProjectedProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" aria-hidden="true" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-600">
                  Projected Profit
                </span>
              </div>
              <p className={`mt-3 text-2xl font-semibold tabular-nums sm:text-3xl ${totalProjectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {projectsWithProfit > 0 ? fmt(totalProjectedProfit) : "--"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {projectsWithProfit > 0 ? `Across ${projectsWithProfit} project${projectsWithProfit !== 1 ? "s" : ""}` : "Add sale prices to see profit"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ────────────────────────────────────────────────── */}
        {/* 2. NEEDS ATTENTION                                */}
        {/* ────────────────────────────────────────────────── */}
        <section className="mb-8" aria-label="Items needing attention">
          <div className="mb-4 flex items-center gap-3">
            <Inbox className="h-6 w-6 text-gray-800" aria-hidden="true" />
            <h2 className="text-xl font-extrabold text-gray-900">Needs Attention</h2>
            {actionItems.length > 0 && (
              <Badge variant="destructive" className="px-2.5 py-0.5 text-sm font-bold tabular-nums">
                {actionItems.length}
              </Badge>
            )}
          </div>

          {actionItems.length === 0 ? (
            <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-800">
                    You&apos;re all caught up!
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    No overdue items or pending actions right now.
                  </p>
                </div>
                <Link
                  href="/admin/projects"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700"
                  aria-label="View all projects"
                >
                  <FolderKanban className="h-4 w-4" aria-hidden="true" />
                  View Projects
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" role="alert" aria-live="polite">
              {groupedActions.map((group) => (
                <div key={group.category}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    {group.category === "overdue" && <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />}
                    {group.category === "task" && <CalendarClock className="h-4 w-4 text-yellow-500" aria-hidden="true" />}
                    {group.category === "permit" && <FileText className="h-4 w-4 text-yellow-500" aria-hidden="true" />}
                    {group.category === "draw" && <ReceiptText className="h-4 w-4 text-blue-500" aria-hidden="true" />}
                    {group.category === "project_details" && <ClipboardList className="h-4 w-4 text-yellow-500" aria-hidden="true" />}
                    {CATEGORY_LABELS[group.category]}
                    <span className="text-sm font-medium tabular-nums text-gray-400">
                      ({group.items.length})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const PriorityIcon = PRIORITY_ICON[item.priority];
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="block"
                          aria-label={`${item.label} - ${item.sublabel} - ${item.detail}`}
                        >
                          <Card className={`group border-l-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${PRIORITY_BORDER[item.priority]}`}>
                            <CardContent className="flex min-h-[44px] items-center gap-4 py-3 px-4">
                              <PriorityIcon
                                className={`h-4 w-4 shrink-0 ${
                                  item.priority === "red"
                                    ? "text-red-500"
                                    : item.priority === "orange"
                                      ? "text-orange-500"
                                      : item.priority === "yellow"
                                        ? "text-yellow-500"
                                        : "text-blue-500"
                                }`}
                                aria-hidden="true"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 transition-colors duration-200 group-hover:text-indigo-600">
                                  {item.label}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {item.sublabel}
                                </p>
                              </div>
                              <div className="hidden shrink-0 text-right sm:block">
                                <p className="text-sm font-semibold tabular-nums text-gray-700">
                                  {item.detail}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition-colors duration-200 group-hover:text-indigo-500" aria-hidden="true" />
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ────────────────────────────────────────────────── */}
        {/* 3. FINANCIAL SNAPSHOT (Draw-focused)               */}
        {/* ────────────────────────────────────────────────── */}
        <section className="mb-8" aria-label="Financial snapshot">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Financial Snapshot
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Draws Funded */}
            <Card className="bg-gradient-to-br from-white to-emerald-50/30 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <Banknote className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Draws Funded</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 sm:text-3xl">
                  {fmt(fundedDrawTotal)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {fundedDraws.length} funded draw{fundedDraws.length !== 1 ? "s" : ""} across all projects
                </p>
              </CardContent>
            </Card>

            {/* Pending Draws */}
            <Card className="bg-gradient-to-br from-white to-blue-50/30 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Pending Draws</h3>
                </div>
                <p className="text-2xl font-bold tabular-nums text-blue-600 sm:text-3xl">
                  {fmt(pendingDrawTotal)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {pendingDraws.length} draw{pendingDraws.length !== 1 ? "s" : ""} awaiting lender funding
                </p>
                {draftDraws.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold tabular-nums text-gray-700">{draftDraws.length}</span>{" "}
                      draft draw{draftDraws.length !== 1 ? "s" : ""} still need{draftDraws.length === 1 ? "s" : ""} submission
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ────────────────────────────────────────────────── */}
        {/* 4. PROJECTS GRID                                  */}
        {/* ────────────────────────────────────────────────── */}
        <section className="mb-8" aria-label="Projects">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Projects</h2>

          {/* Filter Pills */}
          <div className="mb-5 flex flex-wrap gap-3">
            <Link
              href={filterUrl({})}
              className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                !statusFilter
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
              }`}
              aria-label={`Show all projects (${projects.length})`}
              aria-current={!statusFilter ? "true" : undefined}
            >
              All ({projects.length})
            </Link>
            {allStatuses.map((s) =>
              (statusCounts[s] || 0) > 0 ? (
                <Link
                  key={s}
                  href={filterUrl({ status: s })}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    statusFilter === s
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
                  }`}
                  aria-label={`Filter by ${PROJECT_STATUS_LABELS[s]} (${statusCounts[s]})`}
                  aria-current={statusFilter === s ? "true" : undefined}
                >
                  {PROJECT_STATUS_LABELS[s]} ({statusCounts[s]})
                </Link>
              ) : null
            )}
          </div>

          {/* Grid */}
          {filteredProjects.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center">
                <FolderKanban className="mx-auto h-10 w-10 text-gray-400" aria-hidden="true" />
                <p className="mt-4 text-lg font-medium text-gray-700">
                  No projects found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter
                    ? "Try adjusting your filters."
                    : "Create your first project to get started."}
                </p>
                {statusFilter ? (
                  <Link
                    href={filterUrl({})}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-800"
                    aria-label="Clear filters and show all projects"
                  >
                    Clear Filters
                  </Link>
                ) : (
                  <Link
                    href="/admin/projects/new"
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700"
                    aria-label="Create a new project"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Project
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const taskData = tasksByProject[project.id];
                const taskTotal = taskData?.total ?? 0;
                const taskCompleted = taskData?.completed ?? 0;
                const taskPercent =
                  taskTotal > 0
                    ? Math.round((taskCompleted / taskTotal) * 100)
                    : 0;

                return (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="block"
                    aria-label={`${project.name} - ${PROJECT_STATUS_LABELS[project.status]} - ${project.client_name}`}
                  >
                    <Card className={`group cursor-pointer shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-l-4 h-full ${STATUS_LEFT_BORDER[project.status]}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold text-gray-900 transition-colors duration-200 group-hover:text-indigo-600">
                            {project.name}
                          </CardTitle>
                          <Badge variant="outline" className={`px-2.5 py-0.5 shrink-0 text-sm font-semibold ${PROJECT_STATUS_COLORS[project.status]}`}>
                            {PROJECT_STATUS_LABELS[project.status]}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{project.client_name}</span>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 flex flex-col flex-1">
                        {(project.city || project.state) && (
                          <p className="text-sm text-gray-500">
                            {[project.city, project.state]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}

                        {/* Value */}
                        {project.estimated_value != null && (
                          <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">
                            {fmt(project.estimated_value)}
                          </p>
                        )}

                        {/* Task Progress */}
                        {taskTotal > 0 && (
                          <div className="mt-auto pt-3">
                            <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
                              <span>
                                {taskCompleted}/{taskTotal} tasks
                              </span>
                              <span className="font-semibold tabular-nums">{taskPercent}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                                style={{ width: `${taskPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ────────────────────────────────────────────────── */}
        {/* 5. RECENT ESTIMATES                               */}
        {/* ────────────────────────────────────────────────── */}
        {estimates.length > 0 && (
          <section aria-label="Recent estimates">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">
                Recent Estimates
              </h2>
              <Badge variant="secondary" className="px-2.5 py-0.5 text-sm font-semibold tabular-nums">
                {estimates.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {estimates.map((est) => (
                <Card
                  key={est.id}
                  className="shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <CardContent className="flex min-h-[44px] items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <ClipboardCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {est.client_name}
                      </p>
                      <p className="text-sm text-gray-600">{est.project_type}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      {est.estimated_min != null && est.estimated_max != null ? (
                        <p className="text-sm font-semibold tabular-nums text-gray-700">
                          {fmt(est.estimated_min)} &ndash; {fmt(est.estimated_max)}
                        </p>
                      ) : est.budget_range ? (
                        <p className="text-sm font-semibold tabular-nums text-gray-700">
                          {est.budget_range}
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-500">
                        {new Date(est.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`px-2.5 py-0.5 shrink-0 text-sm font-semibold ${
                        est.status === "new"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {est.status === "new" ? (
                        <span className="flex items-center gap-1.5">
                          <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
                          New
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Reviewed
                        </span>
                      )}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
